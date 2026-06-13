// premium-access.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export function getPremiumParams(){
  const p = new URLSearchParams(location.search);
  return {
    resourceId: p.get("resourceId") || "",
    resourceType: p.get("resourceType") || "",
    title: p.get("title") || "Premium Resource",
    amount: p.get("amount") || "",
    currency: p.get("currency") || "USD"
  };
}

export async function userHasAccess(userId, resourceType, resourceId){
  if(!userId || !resourceType || !resourceId) return false;

  const q = query(
    collection(db, "userPurchases"),
    where("userId", "==", userId),
    where("resourceType", "==", resourceType),
    where("resourceId", "==", resourceId),
    where("status", "==", "active")
  );

  const snap = await getDocs(q);
  return !snap.empty;
}

export function requireLogin(callback){
  onAuthStateChanged(auth, async user => {
    if(!user){
      location.href = "auth.html";
      return;
    }
    callback(user);
  });
}

export function premiumButtonHTML(resource){
  const isPremium = (resource.accessType || "").toLowerCase() === "premium";

  if(!isPremium){
    return `<a class="btn primary" href="${resource.readUrl || "#"}">Open Resource</a>`;
  }

  const title = encodeURIComponent(resource.title || "Premium Resource");
  const amount = encodeURIComponent(resource.price || resource.amount || "");
  const type = encodeURIComponent(resource.resourceType || resource.type || "book");
  const id = encodeURIComponent(resource.id || resource.resourceId || "");

  return `<a class="btn gold" href="payment-request.html?resourceType=${type}&resourceId=${id}&title=${title}&amount=${amount}">Unlock Premium</a>`;
}

export async function submitPaymentRequest(payload){
  return await addDoc(collection(db, "payments"), {
    ...payload,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
