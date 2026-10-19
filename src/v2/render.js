// Trusted, code-generated view markup only. Patch existing nodes; never clear a live canvas.
const SMQ_V2_RENDER = (() => {
  function patch(parent, next) {
    const desired=[...next.childNodes];
    desired.forEach((n,i)=>{
      const old=parent.childNodes[i];
      if(!old){parent.appendChild(n.cloneNode(true));return;}
      if(old.nodeType!==n.nodeType||old.nodeName!==n.nodeName){parent.replaceChild(n.cloneNode(true),old);return;}
      if(n.nodeType===3){if(old.data!==n.data)old.data=n.data;return;}
      if(n.nodeType!==1)return;
      for(const a of [...old.attributes])if(!n.hasAttribute(a.name))old.removeAttribute(a.name);
      for(const a of [...n.attributes])if(old.getAttribute(a.name)!==a.value)old.setAttribute(a.name,a.value);
      patch(old,n);
    });
    while(parent.childNodes.length>desired.length)parent.lastChild.remove();
  }
  function update(container,markup){const t=document.createElement('template');t.innerHTML=markup;patch(container,t.content);}
  return {update};
})();
