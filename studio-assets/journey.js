(()=>{
 const root=document.documentElement;
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const reveals=[...document.querySelectorAll('.jy-reveal')];

 // Scroll reveal
 if('IntersectionObserver' in window&&!reduce){
  root.classList.add('jy-js');
  const io=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('jy-in');io.unobserve(entry.target)}});
  },{rootMargin:'0px 0px -8% 0px',threshold:.12});
  reveals.forEach(el=>io.observe(el));
 }else{
  reveals.forEach(el=>el.classList.add('jy-in'));
 }

 // Chapter progress: active chapter in the side rail, thin bar on smaller screens
 const chapters=[...document.querySelectorAll('[data-jy-chapter]')];
 const links=new Map([...document.querySelectorAll('[data-jy-link]')].map(a=>[a.dataset.jyLink,a]));
 const rail=document.querySelector('.jy-rail');
 const bar=document.querySelector('.jy-progress');
 let ticking=false;
 function update(){
  ticking=false;
  const vh=window.innerHeight;
  const mid=vh*.45;
  let active=null;
  for(const ch of chapters){const r=ch.getBoundingClientRect();if(r.top<=mid&&r.bottom>mid){active=ch.id;break}}
  links.forEach((a,id)=>{if(id===active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')});
  if(rail)rail.classList.toggle('jy-visible',!!active);
  if(bar&&chapters.length){
   const first=chapters[0].getBoundingClientRect().top+window.scrollY;
   const last=chapters[chapters.length-1];
   const end=last.getBoundingClientRect().bottom+window.scrollY-vh;
   const p=Math.min(1,Math.max(0,(window.scrollY-first+vh*.5)/Math.max(1,end-first+vh*.5)));
   bar.style.setProperty('--jy-p',p.toFixed(4));
  }
 }
 const onScroll=()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}};
 window.addEventListener('scroll',onScroll,{passive:true});
 window.addEventListener('resize',onScroll);
 update();

 // Boatify reel: click-to-load Instagram embed (no autoplay, no third-party load until asked)
 document.querySelectorAll('[data-jy-reel]').forEach(wrap=>{
  const poster=wrap.querySelector('.jy-reel-poster');
  if(!poster)return;
  poster.setAttribute('role','button');
  poster.setAttribute('aria-label','Play the Boatify reel');
  poster.removeAttribute('target');
  poster.addEventListener('click',event=>{
   event.preventDefault();
   const frame=document.createElement('iframe');
   frame.src=wrap.dataset.jyReel;
   frame.title='Boatify Rentals reel';
   frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
   frame.setAttribute('allowfullscreen','');
   frame.setAttribute('scrolling','no');
   frame.loading='eager';
   wrap.replaceChildren(frame);
   wrap.classList.add('jy-reel-on');
   frame.focus();
  });
  poster.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();poster.click()}});
 });
 // Brand marquee: pause when off screen (CSS handles hover pause and reduced motion)
 const marquee=document.querySelector('.jy-marquee');
 if(marquee&&'IntersectionObserver' in window){
  new IntersectionObserver(([entry])=>marquee.classList.toggle('jy-paused',!entry.isIntersecting)).observe(marquee);
 }
})();
