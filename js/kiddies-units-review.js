const buttons=[...document.querySelectorAll('button[data-unit]')];
for(const button of buttons)button.addEventListener('click',()=>{
 for(const unit of document.querySelectorAll('#units .unit'))unit.hidden=unit.id!==button.dataset.unit;
 for(const choice of buttons)choice.setAttribute('aria-pressed',String(choice===button));
 document.getElementById('unitStatus').textContent=button.dataset.unit==='nursery-unit-01'?'Nursery unit selected. Four lessons; review pending.':'Primary 1 unit selected. Six lessons; review pending.';
});
document.getElementById('printUnit').addEventListener('click',()=>window.print());
