import { auth, db } from "./firebase-config.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
collection,
query,
where,
getDocs,
doc,
getDoc,
updateDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const table =
document.getElementById("approvalTable");

const statusBox =
document.getElementById("status");

function show(message,type="success"){

statusBox.style.display="block";
statusBox.className="status " + type;
statusBox.textContent=message;

}

onAuthStateChanged(auth, async(user)=>{

if(!user){

location.href="auth.html";
return;

}

const adminDoc =
await getDoc(doc(db,"users",user.uid));

if(!adminDoc.exists()){

location.href="auth.html";
return;

}

const adminData =
adminDoc.data();

if(adminData.role !== "school_admin"){

location.href="auth.html";
return;

}

loadPendingUsers(adminData.schoolId);

});

async function loadPendingUsers(schoolId){

table.innerHTML="";

const q=query(
collection(db,"users"),
where("schoolId","==",schoolId),
where("status","==","pending")
);

const snap=await getDocs(q);

if(snap.empty){

table.innerHTML=
`<tr>
<td colspan="5">
No pending approvals.
</td>
</tr>`;

return;

}

snap.forEach(userDoc=>{

const data=userDoc.data();

table.innerHTML += `

<tr>

<td>${data.fullName || ""}</td>

<td>${data.role || ""}</td>

<td>${data.email || ""}</td>

<td>${data.schoolName || ""}</td>

<td>

<button
class="approve"
onclick="approveUser('${userDoc.id}')">
Approve
</button>

<button
class="reject"
onclick="rejectUser('${userDoc.id}')">
Reject
</button>

</td>

</tr>

`;

});

}

window.approveUser = async(uid)=>{

try{

await updateDoc(
doc(db,"users",uid),
{
status:"approved",
approvedAt:serverTimestamp(),
}
);

show("User approved.");

location.reload();

}
catch(err){

console.error(err);

show(err.message,"error");

}

};

window.rejectUser = async(uid)=>{

try{

await updateDoc(
doc(db,"users",uid),
{
status:"rejected",
}
);

show("User rejected.");

location.reload();

}
catch(err){

console.error(err);

show(err.message,"error");

}

};
