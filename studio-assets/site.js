const menuButton=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav-links');
function closeMenu(){nav?.classList.remove('open');menuButton?.setAttribute('aria-expanded','false');menuButton?.setAttribute('aria-label','Open menu');document.body.classList.remove('menu-open')}
menuButton?.addEventListener('click',()=>{const opened=menuButton.getAttribute('aria-expanded')==='true';if(opened){closeMenu()}else{nav.classList.add('open');menuButton.setAttribute('aria-expanded','true');menuButton.setAttribute('aria-label','Close menu');document.body.classList.add('menu-open')}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();if(menuButton&&document.activeElement?.closest('.nav-links'))menuButton.focus()}});
nav?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu()});
window.matchMedia('(min-width:801px)').addEventListener('change',event=>{if(event.matches)closeMenu()});

const filters=[...document.querySelectorAll('[data-filter]')];
const cards=[...document.querySelectorAll('[data-project]')];
const search=document.querySelector('[data-search]');
const resultCount=document.querySelector('[data-result-count]');
const empty=document.querySelector('[data-empty]');
let activeFilter='All';
function updateCatalogue(){const term=(search?.value||'').trim().toLocaleLowerCase();let count=0;for(const card of cards){const category=card.dataset.category;const matchesCategory=activeFilter==='All'||category===activeFilter;const matchesSearch=(card.dataset.search||'').toLocaleLowerCase().includes(term);card.hidden=!(matchesCategory&&matchesSearch);if(!card.hidden)count++}if(resultCount)resultCount.textContent=`${count} ${count===1?'project':'projects'}${activeFilter==='All'?'':` · ${activeFilter}`}${term?' matching your search':''}`;if(empty)empty.hidden=count>0}
filters.forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;filters.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));updateCatalogue()}));
search?.addEventListener('input',updateCatalogue);
document.querySelector('[data-reset]')?.addEventListener('click',()=>{activeFilter='All';if(search)search.value='';filters.forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.filter==='All')));updateCatalogue();search?.focus()});
if(cards.length)updateCatalogue();

const contactForm=document.querySelector('[data-contact-form]');
if(contactForm){const params=new URLSearchParams(location.search);const interest=params.get('interest');const project=params.get('project');const select=contactForm.querySelector('[name=interest]');if(interest&&[...select.options].some(option=>option.value===interest))select.value=interest;if(project)contactForm.querySelector('[name=message]').value=`I'd like to hear more about ${project}.\n\n`;contactForm.addEventListener('submit',event=>{event.preventDefault();if(!contactForm.reportValidity())return;const data=new FormData(contactForm);const subject=`${data.get('interest')} — ${data.get('name')}`;const body=`Hi Majd,\n\n${data.get('message')}\n\n${data.get('name')}\n${data.get('email')}${data.get('company')?'\n'+data.get('company'):''}`;const href=`mailto:mfhijazin@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;const result=document.querySelector('[data-form-result]');result.hidden=false;result.textContent='Your email draft is ready. Open it in your email app to review and send.';const actions=document.querySelector('[data-email-actions]');actions.hidden=false;const open=document.querySelector('[data-open-email]');open.href=href;document.querySelector('[data-copy-message]').onclick=async()=>{try{await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);result.textContent='Message copied. You can paste it into an email to mfhijazin@gmail.com.'}catch{result.textContent='You can open the email draft, or email mfhijazin@gmail.com directly.'}};open.focus()})}
