/* @ds-bundle: {"format":4,"namespace":"Kalaas","components":[{"name":"Button"},{"name":"Badge"},{"name":"Card"},{"name":"Input"},{"name":"Select"},{"name":"Table"},{"name":"Sidebar"}]} */
(function(){
var R=window.React,h=R.createElement,uid=0;
function cx(){return Array.prototype.filter.call(arguments,Boolean).join(" ")}
function omit(p,keys){var o={};for(var k in p){if(keys.indexOf(k)<0)o[k]=p[k]}return o}
function Button(p){var v=p.variant||"primary",s=p.size||"md";
 return h("button",Object.assign({type:"button"},omit(p,["variant","size","className","children"]),{className:cx("kl-btn","kl-btn-"+v,s!=="md"&&"kl-btn-"+s,p.className)}),p.children)}
function Badge(p){var t=p.tone||"neutral";
 return h("span",{className:cx("kl-badge","kl-badge-"+t,p.dot&&"kl-badge-dot",p.className)},p.children)}
function Card(p){
 var head=(p.title||p.eyebrow||p.aside)?h("div",{className:"kl-card-head"},h("div",null,p.eyebrow&&h("p",{className:"kl-card-eyebrow"},p.eyebrow),p.title&&h("h3",{className:"kl-card-title"},p.title)),p.aside||null):null;
 return h("div",{className:cx("kl-card",p.accent&&"kl-card-accent",p.onClick&&"kl-card-interactive",p.className),onClick:p.onClick},head,h("div",{className:"kl-card-body"},p.children),p.footer?h("div",{className:"kl-card-foot"},p.footer):null)}
function Field(p,control,id){
 return h("div",{className:cx("kl-field",p.error&&"kl-field-error",p.className)},
  p.label&&h("label",{className:"kl-field-label",htmlFor:id},p.label,p.required&&h("span",{className:"kl-field-req","aria-hidden":"true"},"*")),
  control,
  (p.error||p.hint)&&h("span",{className:"kl-field-hint",id:id+"-hint"},p.error||p.hint))}
var FIELD=["label","hint","error","className","options","placeholder"];
function useId(p){var r=R.useRef(null);if(!r.current)r.current=p.id||("kl-f"+(++uid));return r.current}
function Input(p){var id=useId(p);
 return Field(p,h("input",Object.assign({type:"text"},omit(p,FIELD),{id:id,placeholder:p.placeholder,className:"kl-input","aria-invalid":p.error?"true":undefined,"aria-describedby":(p.error||p.hint)?id+"-hint":undefined})),id)}
function Select(p){var id=useId(p),opts=(p.options||[]).map(function(o){o=typeof o==="string"?{value:o,label:o}:o;return h("option",{key:o.value,value:o.value},o.label)});
 if(p.placeholder)opts.unshift(h("option",{key:"__ph",value:"",disabled:true},p.placeholder));
 var rest=omit(p,FIELD);if(p.placeholder&&rest.value===undefined&&rest.defaultValue===undefined)rest.defaultValue="";
 return Field(p,h("select",Object.assign(rest,{id:id,className:"kl-input kl-select","aria-invalid":p.error?"true":undefined,"aria-describedby":(p.error||p.hint)?id+"-hint":undefined}),opts),id)}
function Table(p){var cols=p.columns||[],rows=p.rows||[];
 return h("div",{className:cx("kl-table-wrap",p.className)},h("table",{className:"kl-table"},
  h("thead",null,h("tr",null,cols.map(function(c){return h("th",{key:c.key,className:c.align==="right"?"kl-num":undefined},c.label)}))),
  h("tbody",null,rows.length?rows.map(function(r,i){return h("tr",{key:r.id||i},cols.map(function(c){return h("td",{key:c.key,className:c.align==="right"?"kl-num":undefined},c.render?c.render(r):r[c.key])}))}):h("tr",null,h("td",{colSpan:cols.length,className:"kl-table-empty"},p.empty||"Aucune donnée")))))}
function Sidebar(p){
 return h("nav",{className:cx("kl-sidebar",p.className),"aria-label":"Navigation principale"},
  h("div",{className:"kl-sidebar-brand"},p.brand||h(R.Fragment,null,"Kalaas",h("span",null,"."))),
  (p.sections||[]).map(function(s,i){return h("div",{key:i},s.title&&h("div",{className:"kl-sidebar-section"},s.title),
   s.items.map(function(it){var on=it.key===p.active;return h("button",{key:it.key,type:"button",className:cx("kl-nav",on&&"kl-nav-active"),"aria-current":on?"page":undefined,onClick:function(){p.onSelect&&p.onSelect(it.key)}},h("span",{className:"kl-nav-dot"}),it.label,it.count!=null&&h("span",{className:"kl-nav-count"},it.count))}))}),
  p.footer&&h("div",{className:"kl-sidebar-foot"},p.footer))}
window.Kalaas=Object.assign(window.Kalaas||{},{Button:Button,Badge:Badge,Card:Card,Input:Input,Select:Select,Table:Table,Sidebar:Sidebar});
})();
