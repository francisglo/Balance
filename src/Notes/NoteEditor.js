import React from 'react';
import storage from '../services/storage';
import './Notes.css';

const NOTE_PLACEHOLDER = 'Escribe aquí tu idea...';

function TaskBlock({taskId}){
  const [task, setTask] = React.useState(null);
  React.useEffect(()=>{
    const t = (storage.getCollection('tasks')||[]).find(x=>x.id===taskId);
    setTask(t);
  },[taskId]);
  if(!task) return <div className="NoteBlock NoteBlock--missing">Task {taskId} not found</div>;
  return (
    <div className="NoteBlock NoteBlock--task">
      <div className="nb-title">{task.title}</div>
      <div className="nb-meta">{task.status} • {task.priority || 'media'}</div>
    </div>
  );
}

function OKRBlock({okrId}){
  const [okr, setOkr] = React.useState(null);
  React.useEffect(()=>{
    const o = (storage.getCollection('okrs')||[]).find(x=>x.id===okrId);
    setOkr(o);
  },[okrId]);
  if(!okr) return <div className="NoteBlock NoteBlock--missing">OKR {okrId} not found</div>;
  return (
    <div className="NoteBlock NoteBlock--okr">
      <div className="nb-title">{okr.title}</div>
      <div className="nb-meta">KR count: {okr.krs ? okr.krs.length : 0}</div>
    </div>
  );
}

function FormatToolbar({editorRef}){
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  return (
    <div className="NoteEditor-formatToolbar">
      <div className="NoteEditor-formatGroup">
        <button className="NoteEditor-formatBtn" title="Negrita (Ctrl+B)" onClick={() => applyFormat('bold')}>
          <strong>B</strong>
        </button>
        <button className="NoteEditor-formatBtn" title="Cursiva (Ctrl+I)" onClick={() => applyFormat('italic')}>
          <em>I</em>
        </button>
        <button className="NoteEditor-formatBtn" title="Subrayado (Ctrl+U)" onClick={() => applyFormat('underline')}>
          <u>U</u>
        </button>
        <button className="NoteEditor-formatBtn" title="Tachado" onClick={() => applyFormat('strikethrough')}>
          <s>S</s>
        </button>
      </div>

      <div className="NoteEditor-formatGroup">
        <select className="NoteEditor-formatSelect" onChange={(e) => {
          if(e.target.value) applyFormat('formatBlock', e.target.value);
          e.target.value = '';
        }}>
          <option value="">Estilo</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
          <option value="p">Párrafo</option>
        </select>
      </div>

      <div className="NoteEditor-formatGroup">
        <button className="NoteEditor-formatBtn" title="Lista con viñetas" onClick={() => applyFormat('insertUnorderedList')}>
          • Lista
        </button>
        <button className="NoteEditor-formatBtn" title="Lista numerada" onClick={() => applyFormat('insertOrderedList')}>
          1. Nº
        </button>
      </div>

      <div className="NoteEditor-formatGroup">
        <button className="NoteEditor-formatBtn" title="Comilla/Cita" onClick={() => applyFormat('formatBlock', 'blockquote')}>
          ❝ Cita
        </button>
        <button className="NoteEditor-formatBtn" title="Código" onClick={() => applyFormat('formatBlock', 'pre')}>
          &lt;&gt; Código
        </button>
      </div>

      <div className="NoteEditor-formatGroup">
        <button className="NoteEditor-formatBtn" title="Limpiar formato" onClick={() => applyFormat('removeFormat')}>
          ✕ Limpiar
        </button>
      </div>
    </div>
  );
}

export default function NoteEditor(){
  const [okrs, setOkrs] = React.useState([]);
  const editorRef = React.useRef();
  const [blocks, setBlocks] = React.useState([]);
  
  React.useEffect(()=>{
    setOkrs(storage.getCollection('okrs')||[]);
    if(editorRef.current && !editorRef.current.innerHTML){
      editorRef.current.innerHTML = `<p>${NOTE_PLACEHOLDER}</p>`;
    }
  },[]);

  function clearPlaceholderOnType(){
    const editor = editorRef.current;
    if(!editor) return;
    const text = (editor.innerText || '').trim();
    if(text === NOTE_PLACEHOLDER){
      editor.innerHTML = '<p></p>';
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(editor);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function getSelectionText(){
    let sel = window.getSelection();
    if(!sel || sel.rangeCount===0) return '';
    return sel.toString();
  }

  function handleEditorUpdate(){
    const text = editorRef.current?.innerText || '';
    const taskRe = /\[\[task:([0-9_-]+)\]\]/g;
    const okrRe = /\(\(okr:([0-9_-]+)\)\)/g;
    const newBlocks = [];
    let m;
    while((m=taskRe.exec(text))!==null){
      newBlocks.push({type:'task', id:m[1]});
    }
    while((m=okrRe.exec(text))!==null){
      newBlocks.push({type:'okr', id:m[1]});
    }
    setBlocks(newBlocks);
  }

  function parseChecklist(text){
    const lines = text.split(/\r?\n/).map(l=>l.trim());
    const items = lines.filter(l=>/^(-|\*)\s*\[.\]\s+/.test(l) || /^-\s+\[.\]/.test(l) || /^\[.\]/.test(l));
    const fallback = lines.filter(l=>l.startsWith('- '));
    return items.length?items.map(i=>i.replace(/^(-|\*)\s*\[.\]\s*/,'').replace(/^-/,'').trim()):fallback.map(i=>i.replace(/^-\s*/,'').trim());
  }

  function convertSelectionToTask({linkToOkr=null, createSubtasks=false}){
    let sel = getSelectionText().trim();
    if(!sel) {
      sel = editorRef.current?.innerText?.trim() || '';
    }
    if(sel === NOTE_PLACEHOLDER) {
      sel = '';
    }
    if(!sel) { alert('Por favor, escribe algo en el editor primero'); return; }
    
    const now = Date.now();
    const checklist = parseChecklist(sel);
    
    if(createSubtasks && checklist.length>1){
      const parent = storage.addItem('tasks',{
        title: checklist[0],
        status: 'todo',
        priority: 'media',
        okrId: linkToOkr||null,
        createdAt: now,
        columnEnteredAt: { todo: now },
        timeInColumns: {},
      });
      checklist.forEach((text, idx)=>{
        if(text===parent.title) return;
        storage.addItem('tasks',{
          title: text,
          status: 'todo',
          priority: 'baja',
          parentId: parent.id,
          okrId: linkToOkr||null,
          createdAt: now,
          columnEnteredAt: { todo: now },
          timeInColumns: {},
        });
      });
      storage.addItem('activity',{
        type:'note.converted', actorId:'local-user', timestamp: now, noteSnippet: sel.slice(0,200), createdParentId: parent.id
      });
      alert(`✓ Tarea "${parent.title}" + ${checklist.length-1} subtareas creadas`);
      editorRef.current.innerHTML = `<p>${NOTE_PLACEHOLDER}</p>`;
      return;
    }
    
    const t = storage.addItem('tasks',{
      title: sel.split(/\r?\n/)[0],
      status:'todo',
      priority:'media',
      okrId: linkToOkr||null,
      createdAt: now,
      columnEnteredAt: { todo: now },
      timeInColumns: {},
    });
    storage.addItem('activity', { type:'note.converted', actorId:'local-user', timestamp:now, noteSnippet: sel.slice(0,200), createdTaskId: t.id });
    alert(`✓ Tarea creada: "${t.title}"`);
    editorRef.current.innerHTML = `<p>${NOTE_PLACEHOLDER}</p>`;
  }

  const [linkOkr, setLinkOkr] = React.useState('');
  const [createSubtasks, setCreateSubtasks] = React.useState(true);

  return (
    <div className="NoteEditor-root">
      <div className="NoteEditor-header">
        <h2>📝 Suite de Desarrollo de Proyectos</h2>
        <p className="NoteEditor-subtitle">Editor de Documentos + Knowledge Engine</p>
      </div>

      <FormatToolbar editorRef={editorRef} />

      <div className="NoteEditor-actionBar">
        <div className="NoteEditor-leftActions">
          <label>Vincular OKR:</label>
          <select value={linkOkr} onChange={e=>setLinkOkr(e.target.value)} className="NoteEditor-select">
            <option value="">— Sin vincular —</option>
            {okrs.map(o=> <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
          <label className="NoteEditor-checkbox"><input type="checkbox" checked={createSubtasks} onChange={e=>setCreateSubtasks(e.target.checked)} /> Extraer subtareas</label>
        </div>
        <button className="btn" onClick={()=>convertSelectionToTask({linkToOkr: linkOkr||null, createSubtasks})}>⚡ Convertir en tarea</button>
      </div>

      <div
        className="NoteEditor-editor"
        contentEditable
        suppressContentEditableWarning
        ref={editorRef}
        onFocus={clearPlaceholderOnType}
        onBeforeInput={clearPlaceholderOnType}
        onInput={handleEditorUpdate}
        onMouseUp={handleEditorUpdate}
        onKeyUp={handleEditorUpdate}
        onBlur={() => {
          const editor = editorRef.current;
          if(!editor) return;
          const text = (editor.innerText || '').trim();
          if(!text){
            editor.innerHTML = `<p>${NOTE_PLACEHOLDER}</p>`;
          }
        }}
      />

      <div className="NoteEditor-blocks">
        {blocks.map((b,i)=> b.type==='task' ? <TaskBlock key={i} taskId={b.id} /> : <OKRBlock key={i} okrId={b.id} />)}
      </div>
    </div>
  );
}
