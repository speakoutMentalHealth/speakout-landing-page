import { SO } from "../../dashboard-shared.js";
import { renderLearnerNav } from "./role-nav.js";

const activeLabel=document.body.dataset.navLabel||"";

SO.onAuthStateChanged(SO.auth,async user=>{
  if(!user)return;
  try{
    await renderLearnerNav(user,activeLabel);
  }catch(error){
    console.error("Could not render learner navigation.",error);
    const status=document.getElementById("statusBox");
    if(status){
      status.className="notice warn";
      status.textContent="Your page loaded, but some navigation details could not be refreshed.";
    }
  }
});
