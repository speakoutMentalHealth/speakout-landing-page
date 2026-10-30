import { platformRequest } from "./platform-api.js";
// All writes run on the authenticated Worker. This browser never stores an AI key.
const focus=["mental_health_education","research","outreach","programme_support","technology","media","fundraising"];
const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const modes=["remote","hybrid","in_person"];
const el=(tag,cls="",txt="")=>{const x=document.createElement(tag);x.className=cls;x.textContent=txt;return x;};
const status=()=>{const p=el("p","ai-status");p.setAttribute("role","status");return p;};
const pickGroup=(name,values)=>{
  const group=el("fieldset","ai-options");group.append(el("legend","",name));
  values.forEach(value=>{const label=el("label");const box=document.createElement("input");box.type="checkbox";box.value=value;label.append(box,document.createTextNode(value.replaceAll("_"," ")));group.append(label);});
  return group;
};
const selected=g=>Array.from(g.querySelectorAll("input:checked")).map(x=>x.value);
export function setupCoordinatorDirectory(){
  const root=document.getElementById("coordinatorDirectory");if(!root)return;
  const form=document.getElementById("coordinatorForm");
  const list=document.getElementById("coordinatorList");
  const message=document.getElementById("coordinatorMessage");
  const f=name=>form.elements.namedItem(name);
  const groupFocus=pickGroup("Approved expertise",focus);
  const groupDays=pickGroup("Available days",days);
  const groupModes=pickGroup("Supervision mode",modes);
  for(const g of [groupFocus,groupDays,groupModes])form.insertBefore(g,form.querySelector('button[type="submit"]'));
  const edit=c=>{
    const record=c||{};
    for(const key of ["coordinatorId","name","email","capacity","baselineLoad","city","state"])
      f(key).value=record[key]??(key==="baselineLoad"?"0":"");
    f("coordinatorId").value=record.id||"";
    f("active").checked=record.active??true;
    for(const [group,values] of [[groupFocus,record.focusAreas||[]],[groupDays,record.availabilityDays||[]],[groupModes,record.participationModes||[]]])
      group.querySelectorAll("input").forEach(x=>{x.checked=values.includes(x.value);});
    form.hidden=false;
    form.scrollIntoView({block:"nearest"});
  };
  const refresh=async()=>{
    list.replaceChildren();
    try{
      const out=await platformRequest("/v1/admin/volunteers/coordinators/list");
      if(!out.coordinators?.length)list.append(el("p","","No coordinators registered. Add approved coordinators and their capacities."));
      for(const c of out.coordinators||[]){
        const row=el("div","ai-coordinator");
        row.append(el("strong","",c.name),el("span","",(c.active?"Active":"Paused")+" · "+(Number(c.baselineLoad||0)+Number(c.assignedCount||0))+"/"+c.capacity+" allocated"));
        const button=el("button","","Edit");button.type="button";button.addEventListener("click",()=>edit(c));row.append(button);list.append(row);
      }
    }catch(e){list.append(el("p","",e.message||"Unable to load coordinators."));}
  };
  root.addEventListener("toggle",()=>{if(root.open)refresh();});
  document.getElementById("newCoordinator").addEventListener("click",()=>edit(null));
  form.addEventListener("submit",async event=>{
    event.preventDefault();const button=form.querySelector('button[type="submit"]');button.disabled=true;
    message.textContent="Saving approved coordinator…";
    try{
      await platformRequest("/v1/admin/volunteers/coordinators/save",{
        coordinatorId:f("coordinatorId").value||undefined,
        coordinator:{
          name:f("name").value,email:f("email").value,
          capacity:Number(f("capacity").value),
          baselineLoad:Number(f("baselineLoad").value),
          city:f("city").value,state:f("state").value,active:f("active").checked,
          focusAreas:selected(groupFocus),availabilityDays:selected(groupDays),
          participationModes:selected(groupModes)
        }
      });
      form.hidden=true;message.textContent="Coordinator directory saved.";await refresh();
    }catch(e){message.textContent=e.message||"Unable to save coordinator.";}
    finally{button.disabled=false;}
  });
}
export function aiAssignmentPanel(volunteerId,application) {
  const panel=el("details","assignment-editor ai-assignment");
  panel.append(el("summary","","Gemini proposed role and coordinator"));
  const body=el("div","ai-content");
  body.append(el("p","","Gemini drafts the complete assignment. The allocation engine enforces capacity and expertise. Only an administrator can approve publication after independent clearance."));
  const generate=el("button","","Generate with Gemini");generate.type="button";
  const msg=status();
  const preview=el("div","ai-preview");
  const approve=el("button","","Approve and publish");approve.type="button";approve.hidden=true;
  const revise=el("button","","Request revision");revise.type="button";revise.hidden=true;
  const reason=document.createElement("input");reason.type="text";reason.maxLength=180;reason.placeholder="Reason for revision";reason.hidden=true;
  body.append(generate,msg,preview,approve,revise,reason);panel.append(body);
  let draft=null,loaded=false;
  const render=data=>{
    draft=data;preview.replaceChildren();
    const pending=data?.status==="pending";
    approve.hidden=!pending;revise.hidden=!pending;reason.hidden=!pending;
    if(!data){msg.textContent="No draft yet. Generate a recommended assignment.";return;}
    const rows=[
      ["Volunteer role",data.roleTitle],["Selected coordinator",data.coordinatorName],
      ["Coordinator workload",String(data.coordinatorLoad)+"/"+String(data.coordinatorCapacity)],
      ["Approved duties (proposed)",data.scope],["Reporting",data.reportingInstructions],
      ["Status",data.status]
    ];
    for(const [key,value] of rows){
      const row=el("div","ai-field");row.append(el("strong","",key),el("p","",value||"Unavailable"));preview.append(row);
    }
    msg.textContent=pending?"Review the AI draft. Clearance and capacity will be rechecked before approval.":"Draft status: "+data.status;
  };
  panel.addEventListener("toggle",async()=>{
    if(!panel.open||loaded)return;
    try{const result=await platformRequest("/v1/admin/volunteers/ai/draft",{volunteerId});loaded=true;render(result.draft);}
    catch(e){msg.textContent=e.message||"Unable to load draft.";}
  });
  generate.addEventListener("click",async()=>{
    generate.disabled=true;msg.textContent="Gemini is preparing a role and balancing available coordinators…";
    try{
      const result=await platformRequest("/v1/admin/volunteers/ai/suggest",{volunteerId});
      if(result.waitlisted){render(null);msg.textContent=result.message;return;}
      render(result.draft);loaded=true;
    }catch(e){msg.textContent=e.message||"Could not generate draft. Nothing was published.";}
    finally{generate.disabled=false;}
  });
  approve.addEventListener("click",async()=>{
    if(!draft||draft.status!=="pending")return;
    approve.disabled=true;revise.disabled=true;msg.textContent="Checking clearance and capacity…";
    try{
      await platformRequest("/v1/admin/volunteers/ai/approve",{volunteerId,draftId:draft.draftId});
      render({...draft,status:"approved"});application.reviewStage="active";application.placementStatus="assigned";
      msg.textContent="Approved. Assignment published, capacity reserved, and volunteer notified.";
      panel.dispatchEvent(new CustomEvent("volunteerAIApproved",{bubbles:true,detail:{volunteerId}}));
    }catch(e){msg.textContent=e.message||"Approval failed. No assignment was published.";}
    finally{approve.disabled=false;revise.disabled=false;}
  });
  revise.addEventListener("click",async()=>{
    if(!draft||draft.status!=="pending")return;
    revise.disabled=true;
    try{
      await platformRequest("/v1/admin/volunteers/ai/revise",{volunteerId,draftId:draft.draftId,reason:reason.value});
      render({...draft,status:"revision_requested"});
      msg.textContent="Revision recorded. Generate again to see a new proposal.";
    }catch(e){msg.textContent=e.message||"Could not request revision.";}
    finally{revise.disabled=false;}
  });
  return panel;
}
