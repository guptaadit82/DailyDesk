export function groupBy(items, keyName){
  return (items || []).reduce((grouped, item) => {
    const key = item[keyName];
    if(!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
    return grouped;
  }, {});
}

export function countBy(items, keyName){
  return (items || []).reduce((counts, item) => {
    const key = item[keyName] || "Other";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function progressKey(subjectId, itemId){
  return subjectId + ":" + itemId;
}

export function shuffle(items){
  const copy = items.slice();
  for(let index = copy.length - 1; index > 0; index -= 1){
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function slug(value){
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

export function shortTitle(title){
  return String(title || "")
    .replace("Recent National, International, Technical and Sports News", "Current Affairs")
    .replace("Important National and International Days", "Important Days");
}

export function titleCase(value){
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function textOf(value){
  if(value == null) return "";
  if(typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if(Array.isArray(value)) return value.map(textOf).filter(Boolean).join("; ");
  if(typeof value === "object"){
    return Object.entries(value)
      .map(([key, val]) => `${titleCase(key)}: ${textOf(val)}`)
      .join("; ");
  }
  return String(value);
}

export function truncate(value, max = 120){
  const text = textOf(value).replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1) + "..." : text;
}

export function esc(value){
  return textOf(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function attr(value){
  return esc(value);
}

export function escapeRegExp(value){
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlight(value, query){
  const safe = esc(value);
  if(!query) return safe;
  return safe.replace(new RegExp("(" + escapeRegExp(esc(query)) + ")", "ig"), "<mark>$1</mark>");
}

export function todayStr(date = new Date()){
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
