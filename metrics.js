/* Pure, auditable calculations shared by the offline app and verification. */
(function(root) {
  'use strict';
  const sum = a => a.reduce((s,x)=>s+x,0);
  const mean = a => a.length ? sum(a)/a.length : null;
  const ratio = (a,b) => b > 0 ? a/b : null;
  const percent = (a,b) => b > 0 ? 100*a/b : null;
  function calculate(p) {
    const s=p.samples, e=p.events, noct=e.filter(x=>x.role==='nocturnal');
    const total=sum(e.map(x=>x.volume)), nuv=sum(e.filter(x=>x.nuv).map(x=>x.volume));
    const mvv=e.length ? Math.max(...e.map(x=>x.volume)) : null;
    const positive=s.slice(1).filter(x=>x.delta>0);
    const urge=s.filter(x=>x.urgeFlag);
    const efficiency=mean(e.map(x=>100*ratio(x.volume,x.pre)));
    const proxies=sum(s.map(x=>x.urgeEvent));
    const complete=s.length===1441 && s.every((x,i)=>x.minute===i) && e.filter(x=>x.role==='first_morning').length===1;
    return {
      peakFullness:100*Math.max(...s.map(x=>x.fullness)),
      fillingRate:positive.length ? 60*mean(positive.map(x=>x.delta)) : null,
      peakVolume:Math.max(...s.map(x=>x.volume)),
      urgeFullness:urge.length?100*mean(urge.map(x=>x.fullness)):null,
      urgencyProxy:proxies, diaryUrgency:p.diary.filter(x=>x.urgency).length,
      voidCount:e.length, dayCount:e.filter(x=>x.role!=='nocturnal').length, nightCount:noct.length,
      total, meanVoid:mean(e.map(x=>x.volume)), nuv, npi:percent(nuv,total), mvv, ni:ratio(nuv,mvv),
      duration:e.length ? mean(e.map(x=>x.durationSeconds))/60 : null,
      flowSurrogate:mean(e.map(x=>ratio(x.volume,x.durationSeconds))), qmax:null,
      pvr:mean(e.map(x=>x.post)), efficiency,
      completeness:efficiency===null?null:efficiency>=80?'≥80% mean':'<80% mean',
      q2:p.ipss.q2, q7:p.ipss.q7, ipssPartial:p.ipss.q2+p.ipss.q7,
      burden:Math.min(100,20*proxies+15*noct.length+5*Math.max(0,e.length-7)),
      conductance:mean(s.map(x=>x.conductance)), fat:mean(s.map(x=>x.fat)),
      fatTrend:100*(p.trend[0].fat-p.trend[p.trend.length-1].fat)/p.trend[0].fat,
      heartRate:mean(s.map(x=>x.hr)), hrv:Math.min(...s.map(x=>x.hrv)),
      uui:p.diary.filter(x=>x.leak&&x.urgency).length,
      sleepHours:(p.wake-p.sleepStart)/60,
      firstSleep:(((noct.length ? noct[0].minute : p.wake))-p.sleepStart)/60,
      complete
    };
  }
  const definitions=[
    ['nuv','Nocturnal urine volume','mL','Night','Diary convention','Sum of nocturnal voids plus the first morning void. Excludes the pre-sleep void.','Σ volume where NUV included'],
    ['npi','Nocturnal polyuria index','%','Night','Diary convention','Share of 24-hour voided volume assigned to the night. No diagnostic cutoff is applied.','100 × NUV / total voided'],
    ['ni','Nocturia index','×','Night','Diary convention','Overnight output divided by the largest individual void.','NUV / MVV'],
    ['nightCount','Nocturia episodes','events','Night','Diary','Voids marked as awakenings during the sleep opportunity. First morning void is excluded.','Count nocturnal events'],
    ['sleepHours','Sleep opportunity','h','Night','Sleep schedule','Intended sleep interval, not measured sleep time.','(final awakening − sleep start) / 60'],
    ['firstSleep','First uninterrupted interval','h','Night','Diary','Time from sleep start to the first nocturnal void, or final awakening when there are no nocturnal voids. Does not rule out other awakenings.','First nocturnal void / wake − sleep start'],
    ['peakFullness','Peak bladder fullness','%','Filling','Sensor estimate','Peak stored volume relative to the configured capacity. Capacity is a configured model input.','100 × MAX(volume) / capacity'],
    ['fillingRate','Filling rate','mL/h','Filling','Sensor estimate','Mean positive minute-to-minute volume change, scaled to an hour. Excludes emptying intervals; not the 24-hour production rate.','60 × MEAN(positive Δvolume)'],
    ['mvv','Functional capacity · MVV','mL','Filling','Diary convention','Maximum individual voided volume, the diary-based functional capacity proxy.','MAX(event voided volume)'],
    ['peakVolume','Peak stored volume','mL','Filling','Sensor estimate','The source workbook calls this functional capacity. Stored peak volume includes residual, so it is shown separately from MVV.','MAX(bladder volume)'],
    ['urgeFullness','Fullness during urge proxy','%','Filling','Experimental','Mean fullness while HRV <30 ms and fullness >70%. This threshold rule is not a validated urgency detector.','100 × MEAN(fullness where urge flag = 1)'],
    ['urgencyProxy','HRV urgency proxies','events','Filling','Experimental','Rising edges of the HRV/fullness rule. Not equivalent to patient-reported urgency.','Count 0→1 transitions of urge flag'],
    ['diaryUrgency','Reported urgency','events','Filling','Diary','Diary entries, independent of the HRV rule.','Count diary urgency entries'],
    ['voidCount','Total voids','events','Voiding','Diary','All known events in (recording start, recording end].','Count included events'],
    ['dayCount','Waking void frequency','events','Voiding','Diary','All non-nocturnal voids, including pre-sleep and first morning. Uses the sleep schedule, not fixed clock hours.','Count events with role ≠ nocturnal'],
    ['total','24-hour voided volume','mL','Voiding','Sensor estimate','Sum of event pre-minus-post estimates. Never sum stored minute-by-minute bladder volumes.','Σ (pre-void − post-void)'],
    ['meanVoid','Mean voided volume','mL','Voiding','Sensor estimate','Average individual void volume across this 24-hour recording.','Total voided / event count'],
    ['duration','Mean void duration','min','Voiding','Event timing','Separate duration input for each void. Cannot be resolved from one-minute bladder snapshots.','MEAN(duration seconds) / 60'],
    ['flowSurrogate','Mean flow surrogate','mL/s','Voiding','Experimental','Mean of volume / duration for each event, using the event duration. This is average flow, not peak flow.','MEAN(event volume / event seconds)'],
    ['qmax','Peak flow · Qmax','mL/s','Voiding','Needs uroflow','Unavailable. One-minute samples and a total duration cannot resolve peak flow; a validated high-rate flow trace is required.','Not calculable from supplied data'],
    ['pvr','Mean post-void residual','mL','Emptying','Sensor estimate','Mean stored volume at known post-void samples, not the global minimum of the recording. Requires clinical validation against a residual measurement.','MEAN(event post-void volume)'],
    ['efficiency','Voiding efficiency','%','Emptying','Sensor estimate','Mean per-event fraction emptied. Assumes zero production during the void transition.','MEAN(100 × voided / pre-void)'],
    ['completeness','Emptying rule','label','Emptying','Experimental','Source-workbook 80% efficiency rule, shown as a numerical label rather than a clinical claim of complete emptying.','Mean efficiency ≥80%'],
    ['q2','IPSS · Q2 frequency','/5','Symptoms','Questionnaire','Explicit past-month questionnaire response. A one-day void count cannot supply this score.','Questionnaire Q2 response'],
    ['q7','IPSS · Q7 nocturia','/5','Symptoms','Questionnaire','Explicit past-month nocturia response, not automatically derived from this single night.','Questionnaire Q7 response'],
    ['ipssPartial','IPSS · Q2 + Q7','/10','Symptoms','Questionnaire','Two domains only. This is not a total IPSS; five symptom questions are absent.','Q2 + Q7'],
    ['burden','Exploratory symptom index','/100','Symptoms','Experimental','Unvalidated arithmetic index retained for traceability to the source workbook. No clinical severity bands are assigned.','MIN(100, 20×urge proxies + 15×night voids + 5×MAX(0,voids−7))'],
    ['uui','Urge-associated leaks','events','Symptoms','Diary','Explicit leakage entries accompanied by urgency. No leakage volume is inferred from impedance.','Count diary entries with urgency AND leak'],
    ['conductance','Mean regional conductance','mS','Context','Experimental','Reciprocal of regional impedance. Not a validated body-composition measurement.','MEAN(1000 / Z_fat)'],
    ['fat','Mean regional impedance','Ω','Context','Experimental','Mean of the source Z_fat channel. Electrode contact and hydration can affect this signal.','MEAN(Z_fat)'],
    ['fatTrend','8-week impedance reduction','%','Context','Experimental','Baseline-relative change in weekly impedance values. A negative reduction means impedance increased. This does not establish fat loss or treatment response.','100 × (week 0 − week 8) / week 0'],
    ['heartRate','Mean heart rate','bpm','Context','Context','Average of minute-level heart-rate values.','MEAN(heart_rate_bpm)'],
    ['hrv','Minimum HRV · RMSSD','ms','Context','Context','Minimum minute-level RMSSD. HRV alone does not identify urgency.','MIN(hrv_rmssd_ms)']
  ].map(([key,label,unit,group,status,detail,formula])=>({key,label,unit,group,status,detail,formula}));
  root.MiFlowMetrics={calculate,definitions};
  if(typeof module!=='undefined')module.exports=root.MiFlowMetrics;
})(typeof window!=='undefined'?window:globalThis);
