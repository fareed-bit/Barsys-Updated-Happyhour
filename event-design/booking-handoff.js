document.addEventListener('DOMContentLoaded',()=>{
 const q=new URLSearchParams(location.search),guests=document.querySelector('#wiz-guest-count');
 const count=Number(q.get('guests'));
 if(guests&&Number.isInteger(count)&&count>=20&&count<=500){guests.value=count;guests.dispatchEvent(new Event('change',{bubbles:true}));}
 const tiers={classic:'Classic',signature:'Signature',reserve:'Reserve'};
 const tier=tiers[q.get('tier')];
 if(tier)document.querySelector(`.package-card--selectable[data-value="${tier}"]`)?.click();
 const menus={"signature": "The Signature Mixlist", "agave": "The Agave Lover's", "spritz": "Apr\u00e8s Spritz Club", "fluid": "Fluid Code", "vibrant": "The Vibrant Classics", "neon": "Neon Shadows", "bold-frequency": "Bold Frequency", "sharp": "Sharp & Steady", "silk": "Silk & Snap", "coast": "Clear Coast", "dusk": "Dusk to Agave", "molasses": "Molasses Theory", "circuit": "The Bold Circuit", "love": "Love at First Sip", "confessions": "Confessions in Glass", "sombra": "Sombra & Sol", "flora": "Flora-Bitter", "punt": "Punt, Pass, & Pour", "turf": "Turf & Tonic", "botanicals": "13 Botanicals", "summer-mocktails": "A Summer Mocktail Mixlist", "bean-barrel": "Bean & Barrel", "zen-juniper": "Zen & Juniper", "bean-bolt-bitter": "Bean, Bolt & Bitter", "vermouth-valley": "Vermouth Valley", "boisson-non-alcoholic-agave-lover-s-mixlist": "Boisson Non-Alcoholic Agave Lover\u2019s", "the-ultra-records": "The Ultra Records"};
 const menu=menus[q.get('menu')];
 if(menu)[...document.querySelectorAll('.wizard__mixlist-option')].find(el=>el.dataset.value===menu)?.click();
 if(q.has('guests')||tier||menu)document.querySelector('#wizard-begin')?.click();
});
