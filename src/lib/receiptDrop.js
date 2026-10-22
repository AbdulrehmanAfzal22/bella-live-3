export const isReceiptFileDrag=event=>Array.from(event.dataTransfer?.types||[]).includes('Files')||!!event.dataTransfer?.files?.length;
export function preventReceiptNavigation(event){if(isReceiptFileDrag(event))event.preventDefault();}
export function receiveReceiptDrop(event,onSelect,disabled=false){
  if(!isReceiptFileDrag(event))return;
  event.preventDefault();event.stopPropagation();
  const file=event.dataTransfer?.files?.[0];
  if(file&&!disabled)return onSelect(file);
}
