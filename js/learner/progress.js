import { SO } from "../../dashboard-shared.js";
import { learningApi } from "../platform-api.js";
import { statusLabel } from "./ui-utils.js";

SO.onAuthStateChanged(SO.auth, async user=>{
  if(!user)return;
  try{
    const dashboard=await learningApi.dashboard();
    const internal=dashboard.progress||[];
    const external=dashboard.externalLearning||[];
    const internalCompleted=internal.filter(r=>r.status==="completed"||Number(r.percent||0)>=100);
    const externalCompleted=external.filter(r=>["approved","verified"].includes(String(r.status||r.verificationStatus||"").toLowerCase()));
    total.textContent=SO.num(internal.length+external.length);
    done.textContent=SO.num(internalCompleted.length+externalCompleted.length);
    externalCount.textContent=SO.num(external.length);
    avg.textContent=(internal.length?Math.round(internal.reduce((a,r)=>a+Number(r.percent||0),0)/internal.length):0)+"%";

    const internalRows=internal.map(r=>{
      const pct=Math.max(0,Math.min(100,Number(r.percent||0)));
      return `<tr>
        <td>${SO.safe(r.courseTitle||"SpeakHub Course")}</td>
        <td>SpeakHub</td>
        <td>${SO.badge(r.status||"in_progress")}</td>
        <td><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div> ${SO.num(pct)}%</td>
        <td>${SO.safe(r.updatedAt||r.enrolledAt)}</td>
        <td><a class="btn soft" href="course-player.html?id=${encodeURIComponent(r.courseId)}">Open</a></td>
      </tr>`;
    });
    const externalRows=external.map(r=>{
      const raw=String(r.status||r.verificationStatus||"started");
      const label=statusLabel(raw);
      return `<tr>
        <td>${SO.safe(r.courseTitle||"External Course")}</td>
        <td>External • ${SO.safe(r.provider||"Provider")}</td>
        <td>${SO.badge(label)}</td>
        <td>${SO.safe(label==="Verified"?"Completion evidence verified":label==="Pending Review"?"Evidence under review":"Provider pathway tracked")}</td>
        <td>${SO.safe(r.updatedAt||r.submittedAt||r.startedAt||r.createdAt)}</td>
        <td><a class="btn soft" href="course-details.html?id=${encodeURIComponent(r.courseId)}">View Pathway</a></td>
      </tr>`;
    });
    rows.innerHTML=[...internalRows,...externalRows].join("")||`<tr><td colspan="6">No learning records yet. <a href="speakhub.html">Browse courses</a> to start learning.</td></tr>`;
  }catch(error){
    rows.innerHTML=`<tr><td colspan="6">${SO.safe(error.message||"Could not load progress.")}</td></tr>`;
  }
});
