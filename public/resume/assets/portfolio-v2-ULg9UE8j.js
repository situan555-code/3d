import"./modulepreload-polyfill-B5Qt9EMX.js";import{c as d}from"./caseStudies-Bl0KohCP.js";import{i as p}from"./glass-sphere-BVoBx5DY.js";const v=["prototype_app","mavin_50_years","cgi_configurator","retail_kiosk","polymount_greenscreen","isoshock","product_photography","virtual_tours","lifestyle_photography","portfolio_assets"];function c(){p();const t=document.getElementById("app"),e=document.createElement("div");e.className="portfolio-v2",e.innerHTML=`
    <section class="v2-hero">
      <div class="v2-hero__eyebrow">Creative Technologist — Portfolio</div>
      <h1 class="v2-hero__name">Building at the<br><span>intersection of craft & code</span></h1>
      <p class="v2-hero__role">From 3D product configurators and AI-powered iOS apps to trade show campaigns and retail kiosk systems — I build the tools and visual systems that modern manufacturers need.</p>
      <div class="v2-hero__scroll">
        <span>Scroll</span>
        <div class="v2-hero__scroll-line"></div>
      </div>
    </section>
  `;let s=1;for(const r of v){const a=d[r];if(!a)continue;const n=document.createElement("section");n.className="v2-section",n.id=`study-${r}`;const l=String(s).padStart(2,"0");n.innerHTML=`
      <div class="v2-section__number">${l}</div>
      <div class="v2-card" data-animate>
        <div class="v2-card__header">
          <h2 class="v2-card__title">${a.title}</h2>
          <div class="v2-card__meta">
            ${a.role?`<span><span class="dot"></span>${a.role}</span>`:""}
            ${a.timeline?`<span><span class="dot"></span>${a.timeline}</span>`:""}
          </div>
        </div>
        <div class="v2-card__blocks">
          ${m(a.blocks||[])}
        </div>
      </div>
    `,e.appendChild(n),s++}const o=document.createElement("footer");o.className="v2-footer",o.innerHTML=`
    <div class="v2-footer__links">
      <a href="https://linkedin.com" target="_blank" rel="noopener">LinkedIn</a>
      <a href="mailto:hello@agency.com">Email</a>
      <a href="/index.html">Agency Site</a>
    </div>
    <div class="v2-footer__retro">
      <a href="/portfolio.html">[ launch retro OS portfolio ]</a>
    </div>
  `,e.appendChild(o),t.appendChild(e),_()}function m(t){return t.map(e=>{switch(e.type){case"text":return`
          <div class="v2-block">
            ${e.heading?`<h3 class="v2-block__heading">${e.heading}</h3>`:""}
            <p class="v2-block__text">${i(e.content)}</p>
          </div>
        `;case"image":return`
          <div class="v2-block">
            <div class="v2-block__image">
              <img src="${e.src}" alt="${i(e.caption||"")}" loading="lazy" />
            </div>
            ${e.caption?`<p class="v2-block__caption">${i(e.caption)}</p>`:""}
          </div>
        `;case"video":return`
          <div class="v2-block">
            <div class="v2-block__video">
              <video src="${e.src}" controls muted loop playsinline></video>
            </div>
            ${e.caption?`<p class="v2-block__caption">${i(e.caption)}</p>`:""}
          </div>
        `;case"iframe":return`
          <div class="v2-block">
            <div class="v2-block__iframe">
              <iframe
                src="${e.src}"
                title="${i(e.caption||"Interactive embed")}"
                style="aspect-ratio: ${e.aspectRatio||"4 / 3"};"
                allow="accelerometer; gyroscope"
              ></iframe>
            </div>
            ${e.caption?`<p class="v2-block__caption">${i(e.caption)}</p>`:""}
          </div>
        `;default:return""}}).join("")}function i(t){return t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function _(){const t=document.querySelectorAll("[data-animate]"),e=new IntersectionObserver(s=>{s.forEach(o=>{o.isIntersecting&&o.target.classList.add("visible")})},{threshold:.15,rootMargin:"0px 0px -50px 0px"});t.forEach(s=>e.observe(s))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c();
