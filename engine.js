export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z]/g,'');
export function createGame(puzzle, terms, saved) {
  const words = puzzle.words.map((w,id) => ({...w,id,term:terms[w.termId],keys:Array.from(terms[w.termId].answer,(_,i)=>`${w.row+(w.dir==='V'?i:0)},${w.col+(w.dir==='H'?i:0)}`)}));
  const cells = {};
  for (const w of words) w.keys.forEach((key,i)=>{ if(!cells[key]) cells[key]={answer:w.term.answer[i],words:[]}; cells[key].words.push(w.id); });
  let state={puzzleId:puzzle.id,letters:{},solved:[],revealed:[],hints:0,mistakes:0,selected:0,cursor:0,completed:false};
  if(saved?.puzzleId===puzzle.id){
    for(const [key,value] of Object.entries(saved.letters||{})) if(cells[key]&&/^[A-Z]$/.test(value)) state.letters[key]=value;
    state.solved=[...new Set((Array.isArray(saved.solved)?saved.solved:[]).filter(id=>words[id]&&words[id].keys.every((k,i)=>state.letters[k]===words[id].term.answer[i])))];
    state.revealed=[...new Set((Array.isArray(saved.revealed)?saved.revealed:[]).filter(k=>cells[k]&&state.letters[k]===cells[k].answer))];
    for(const k of ['hints','mistakes'])state[k]=Number.isSafeInteger(saved[k])&&saved[k]>=0?saved[k]:0;
    state.hints=Math.max(state.hints,state.revealed.length);
    if(Number.isInteger(saved.selected)&&words[saved.selected])state.selected=saved.selected;
    if(Number.isInteger(saved.cursor)&&saved.cursor>=0&&saved.cursor<words[state.selected].keys.length)state.cursor=saved.cursor;
    state.completed=state.solved.length===words.length;
  }
  const game={puzzle,words,cells,state,
    get active(){return words[state.selected]},
    locked(key){return state.revealed.includes(key)||cells[key].words.some(id=>state.solved.includes(id))},
    select(id,index){if(!words[id])return;state.selected=id;state.cursor=index??Math.max(0,words[id].keys.findIndex(k=>!state.letters[k]&&!game.locked(k)));},
    selectCell(key){const ids=cells[key]?.words;if(!ids)return;const id=ids.includes(state.selected)?ids[(ids.indexOf(state.selected)+1)%ids.length]:ids[0];game.select(id,words[id].keys.indexOf(key));},
    next(){for(let j=1;j<=words.length;j++){const id=(state.selected+j)%words.length;if(!state.solved.includes(id)){game.select(id);return}}},
    type(value){const char=normalize(value);if(char.length!==1||state.completed)return false;const keys=game.active.keys;let i=state.cursor;if(game.locked(keys[i])){i=keys.findIndex((k,j)=>j>=state.cursor&&!game.locked(k));if(i<0)i=keys.findIndex(k=>!game.locked(k));}if(i<0)return false;state.letters[keys[i]]=char;const next=keys.findIndex((k,j)=>j>i&&!game.locked(k));state.cursor=next<0?i:next;return true;},
    erase(){if(state.completed)return;const keys=game.active.keys;let i=state.cursor;if(!state.letters[keys[i]]||game.locked(keys[i])){i--;while(i>=0&&game.locked(keys[i]))i--;}if(i>=0){delete state.letters[keys[i]];state.cursor=i;}},
    hint(){if(state.completed)return false;const key=game.active.keys.find(k=>!game.locked(k)&&state.letters[k]!==cells[k].answer);if(!key)return false;state.letters[key]=cells[key].answer;state.revealed.push(key);state.hints++;state.cursor=game.active.keys.indexOf(key);return true;},
    check(){const w=game.active;if(state.solved.includes(w.id))return 'already';if(w.keys.some(k=>!state.letters[k]))return 'incomplete';if(!w.keys.every((k,i)=>state.letters[k]===w.term.answer[i])){state.mistakes++;return 'wrong';}state.solved.push(w.id);state.completed=state.solved.length===words.length;return state.completed?'complete':'correct';},
    score(){const base=state.solved.reduce((n,id)=>n+words[id].keys.length*(5+5*puzzle.level),0);return Math.max(0,base+(state.completed?100*puzzle.level:0)-state.hints*15-state.mistakes*5);}
  };return game;
}
