import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

process.env.RUNTIME_NODE_MODULES ??= '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
process.env.RUNTIME_NODE ??= '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node';
const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.dirname(sourceDir);
const buildDir = path.join(workspaceDir, '.build');
const outputDir = path.join(workspaceDir, 'deliverables');
const finalizedDir = path.join(workspaceDir, '.finalized');
const SKILL_DIR = '/Users/shivamgupta/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations';
const RUNTIME_PYTHON = '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const { resolvePresentationFont, finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')).href);
const family = resolvePresentationFont({fontFamily: 'Noto Sans'});
const C = {navy:'#102943', blue:'#2260df', ice:'#f6f8fb', white:'#ffffff', muted:'#52677b', line:'#cbd6e2', pale:'#aebfd3'};
const REPO = 'https://github.com/shi1720/Amazon-Developer-Hackathon';
const release = JSON.parse(await fs.readFile(path.join(sourceDir,'release-status.json'),'utf8'));
const APP_URL = release.applicationUrl;
const APP_ACCESS_LABEL = release.publicVerified ? 'Verified public app' : 'Hosted app verification pending';
const GUARD_REPO = 'https://github.com/shi1720/kindhandoff-guard';
const GUARD_CONTRIBUTION = GUARD_REPO + '/commit/04a15ea016e552e3c031b9ec371af2df6a1de105';
const presentation = Presentation.create({slideSize:{width:1280,height:720}});
presentation.theme.colorScheme={name:'KindHandoff',themeColors:{accent1:C.blue,accent2:C.navy,accent3:C.muted,accent4:C.pale,accent5:C.ice,accent6:C.line,bg1:C.white,bg2:C.ice,tx1:C.navy,tx2:C.muted,dk1:C.navy,dk2:C.muted,lt1:C.white,lt2:C.ice,hlink:C.white,folHlink:C.pale}};
await Promise.all([buildDir,outputDir,finalizedDir].map(p=>fs.mkdir(p,{recursive:true})));

function text(slide,name,value,x,y,w,h,size=28,color=C.navy,bold=false,align='left') {
  const s = slide.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  s.text=value;
  s.text.style={typeface:family,fontSize:size,color,bold,alignment:align,verticalAlignment:'top',autoFit:'none',wrap:'square',insets:{left:0,right:0,top:0,bottom:0}};
  return s;
}
function line(slide,name,x,y,w,h=0,color=C.line,width=1.5,dashed=false){
  return slide.shapes.add({geometry:'line',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:color,width,style:dashed?'dashed':'solid'}});
}
function node(slide,name,x,y,w,h,stroke=C.blue,fill='none'){
  return slide.shapes.add({geometry:'rect',name,position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:2,style:'solid'}});
}
function connect(slide,from,to,name,color=C.blue,fromSide='right',toSide='left'){
  return slide.shapes.connect(from,to,{name,kind:'straight',fromSide,toSide,line:{fill:color,width:2,style:'solid'},tail:{type:'triangle',width:'sm',length:'sm'}});
}
function addSlide(number,title,sub='',dark=false){
  const slide=presentation.slides.add();slide.background.fill=dark?C.navy:C.ice;
  text(slide,'wordmark','kindhandoff',64,30,700,40,25,dark?C.white:C.navy,true);
  text(slide,'page',String(number).padStart(2,'0'),1150,34,66,30,17,dark?C.pale:C.muted,false,'right');
  if(title)text(slide,'title',title,64,102,1152,116,48,dark?C.white:C.navy,true);
  if(sub)text(slide,'subtitle',sub,64,205,1152,78,25,dark?C.pale:C.muted);
  return slide;
}
function footer(slide,value,dark=false){text(slide,'footer',value,64,661,1152,32,16,dark?C.pale:C.muted);}
function notes(slide,value){slide.speakerNotes.textFrame.setText(value);}
function label(slide,name,value,x,y,w=300,color=C.muted){return text(slide,name,value,x,y,w,32,19,color,true);}
function linkedText(slide,name,labelText,url,x,y,w,h,size,color){
 const s=text(slide,name,labelText,x,y,w,h,size,color,false);s.text.get(labelText).link={uri:url,isExternal:true};s.text.get(labelText).fill=color;return s;
}

// 1. Cover and problem. The task chain is an editable evidence diagram.
{
 const s=addSlide(1,'','',true);
 text(s,'cover-title','Family support,\nwhen plans change',64,151,722,178,66,C.white,true);
 text(s,'cover-problem','A cancelled afternoon leaves\ntwo commitments to recover.',64,374,675,90,29,C.pale);
 text(s,'creator','Created by Shivam Gupta',64,585,680,38,24,C.white,true);
 const bag=node(s,'bag-node',856,178,326,134,C.pale);
 text(s,'bag-time','14:30-14:45',879,197,280,28,21,C.pale);
 text(s,'bag-task','Pack library bag',879,240,280,44,28,C.white,true);
 const ride=node(s,'ride-node',856,400,326,134,C.pale);
 text(s,'ride-time','15:00-16:00',879,419,280,28,21,C.pale);
 text(s,'ride-task','Give the ride',879,462,280,44,28,C.white,true);
 connect(s,bag,ride,'bag-to-ride-dependency',C.pale,'bottom','top');
 text(s,'prerequisite-label','Bag first',1060,341,145,32,18,C.pale);
 footer(s,'Alexa+ primary track. Fictional household shown.',true);
 notes(s,'KindHandoff is a new practical-support coordination project by Shivam Gupta. The diagram represents an illustrative household, not customer evidence. Maya becomes unavailable for both the bag task from 14:30 to 14:45 and ride from 15:00 to 16:00. The ride depends on the bag task. Main repository: '+REPO+'. No live Alexa deployment or commercial traction is claimed.');
}
// 2. Explicit facts make the proposed split understandable.
{
 const s=addSlide(2,'A workable split between helpers','Maya cannot help this afternoon. Both commitments need a replacement.');
 const table=s.tables.add({rows:4,columns:3,left:64,top:300,width:1152,height:278,columnWidths:[220,576,356],values:[
 ['Helper','Availability and capabilities','Planner proposal'],
 ['Maya','Unavailable all afternoon','Reassign both tasks'],
 ['Jo','Home access 14:00-15:00\nCannot drive','Bag 14:30-14:45'],
 ['Dev','Available from 14:45\nCan drive','Ride 15:00-16:00']
 ]});
 table.styleOptions={headerRow:true,bandedRows:false};
 for(let r=0;r<4;r++){
   table.rows[r].height=r===0?52:r===1?66:80;
   for(let c=0;c<3;c++){
    const cell=table.getCell(r,c);cell.fill=r===0?C.navy:r%2?C.white:C.ice;
    cell.text.style={typeface:family,fontSize:r===0?20:25,color:r===0?C.white:c===2?C.blue:C.navy,bold:r===0||c===0,autoFit:'none'};
   }
 }
 table.cells.block({row:0,column:0,rowCount:4,columnCount:3}).assign({margins:{left:18,right:18,top:12,bottom:10},anchor:'center'});
 table.borders.assign({fill:C.line,width:1,style:'solid'});
 footer(s,'The proposed split respects time, home access, driving, and the bag prerequisite.');
 notes(s,'Illustrative product scenario supplied for this deck. The deterministic planner proposes Jo for the 14:30-14:45 bag task because she can access the house during that interval. Dev can provide the 15:00-16:00 ride but cannot cover the earlier bag interval because his availability starts at 14:45. A feasible proposal is not an accepted commitment.');
}
// 3. State semantics, with the bag completion as a separate prerequisite.
{
 const s=addSlide(3,'Commitment states','The named helper accepts the offer. The prerequisite controls when work can start.');
 const xs=[64,369,674,979];
 const states=[['01','Proposed','A feasible replacement'],['02','Offered','Waiting for Dev'],['03','Accepted','Dev takes responsibility'],['04','Ready','After Jo packs the bag']];
 const nodes=[];
 states.forEach((v,i)=>{
  const p=node(s,'state-'+i,xs[i],361,235,112,i===3?C.blue:C.line,i===3?C.white:'none');nodes.push(p);
  text(s,'step-'+i,v[0],xs[i],306,235,38,23,C.blue,true);
  text(s,'state-name-'+i,v[1],xs[i]+14,385,207,44,31,i===3?C.blue:C.navy,true);
  text(s,'state-detail-'+i,v[2],xs[i],504,235,72,22,C.muted);
 });
 for(let i=0;i<3;i++)connect(s,nodes[i],nodes[i+1],'state-link-'+i,C.blue);
 text(s,'waiting-note','Accepted ride waits for the bag',641,598,574,38,23,C.blue,true,'right');
 footer(s,'A brief acknowledgment records the plan version the helper read.');
 notes(s,'The diagram describes workflow states, not measured test results. The named helper must accept their own offer. Acceptance alone does not remove the dependency. The ride becomes ready only after Jo records bag completion. The product records brief acknowledgment against the version read. An accepted task is a recorded commitment, not proof of real-world completion.');
}
// 4. One set of domain rules behind all clients.
{
 const s=addSlide(4,'Shared rules behind the workflow','Web simulator and external MCP clients use the same validated workflow.');
 const specs=[
 {x:64,w:255,title:'Firebase Hosting',a:'Web simulator',b:'React 19.3\nVite 8.3'},
 {x:361,w:255,title:'Functions v2 / MCP',a:'SDK 1.30.0',b:'Streamable HTTP\nSpec 2025-11-25'},
 {x:658,w:255,title:'Validated tools',a:'Identity + input checks',b:'Planner + handoff guard'},
 {x:955,w:261,title:'Firestore',a:'Household-scoped data',b:'Version check on write\nTransaction'}
 ];
 const ns=[];
 for(let i=0;i<specs.length;i++){
  const a=specs[i];label(s,'architecture-title-'+i,a.title,a.x,308,a.w,C.blue);
  ns.push(node(s,'architecture-node-'+i,a.x,355,a.w,202,C.line,C.white));
  text(s,'architecture-a-'+i,a.a,a.x+17,377,a.w-34,81,24,C.navy,true);
  text(s,'architecture-b-'+i,a.b,a.x+17,464,a.w-34,84,21,C.muted);
 }
 for(let i=0;i<3;i++)connect(s,ns[i],ns[i+1],'architecture-link-'+i,C.blue);
 text(s,'auth-note','Firebase email/password sign-in and one-time helper invitations.',64,595,1152,40,23,C.navy);
 footer(s,'Deterministic language simulation. Live Alexa+ onboarding remains a next step.');
 notes(s,'Architecture supplied by the implementation team. React 19.3 and Vite 8.3 frontend on Firebase Hosting. MCP server uses @modelcontextprotocol/sdk 1.30.0, Streamable HTTP, and protocol 2025-11-25 in Cloud Functions v2 on Node 22. Authenticated tools validate inputs and membership, use deterministic planning and @kindhandoff/guard, and write household-scoped Firestore Standard records with version-aware transactions. Firebase Authentication email/password establishes account identity and the app uses a secure __session cookie plus one-time helper invitations. Firestore and Functions run in us-central1. Runtime settings: 256 MiB, 1 CPU, concurrency 40, minInstances 0, maxInstances 2, timeout 30 seconds. Seven-day artifact cleanup is configured. The guard library provides state transitions, coverage accounting, and candidate ranking. App code owns dependency readiness, exact identity authorization, and contentVersion brief acknowledgments. The deterministic browser language simulator uses Client and StreamableHTTPClientTransport to make real HTTP MCP initialize and tools/call requests. External MCP clients use the same server. No load-test result, native Alexa connection, cloud LLM, or AWS use is asserted. '+'Public workflow verification is documented in the repository evidence.'+' Amazon documentation: https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-overview.html and https://www.developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-quickstart.html.');
}
// 5. Honest category comparison. Native table preserves editability.
{
 const s=addSlide(5,'Where KindHandoff fits','Care calendars, voice notes, and handoff summaries already exist.');
 const table=s.tables.add({rows:4,columns:2,left:64,top:296,width:1152,height:254,columnWidths:[350,802],values:[
 ['Alternative','Published strength'],
 ['Caring Village','Care calendar, shared tasks, and an AI assistant'],
 ['Family CareRelay','Confirmed voice entries and handoff summaries'],
 ['Group chat + calendar','Familiar tools the household already uses']
 ]});
 table.styleOptions={headerRow:true,bandedRows:false};
 for(let r=0;r<4;r++){
  table.rows[r].height=r===0?52:67;
  for(let c=0;c<2;c++){
   let cell=table.getCell(r,c);cell.fill=r===0?C.navy:r%2?C.white:C.ice;
   cell.text.style={typeface:family,fontSize:r===0?20:25,color:r===0?C.white:C.navy,bold:r===0||c===0,autoFit:'none'};
  }
 }
 table.cells.block({row:0,column:0,rowCount:4,columnCount:2}).assign({margins:{left:18,right:18,top:13,bottom:10},anchor:'center'});
 table.borders.assign({fill:C.line,width:1,style:'solid'});
 text(s,'our-focus','KindHandoff focuses on repairing disrupted commitments',64,575,1152,45,30,C.blue,true);
 footer(s,'Published feature comparison. We have not established that this workflow is exclusive.');
 notes(s,'Sources reviewed 15 September 2026. Caring Village official features: https://caringvillage.com/app/ . Family CareRelay official product page: https://www.familycarerelay.com/ . Both describe substantial overlap with generic care coordination; voice logging and summaries alone are not claimed as novel. KindHandoff focuses on constraint-aware recovery, exact helper acceptance, and dependency readiness. This is a published-feature comparison, not a hands-on competitive benchmark. Group chat and calendar are the practical adoption baseline.');
}
// 6. A business hypothesis, not traction.
{
 const s=addSlide(6,'A household subscription to test','The first customer coordinates recurring practical support for a parent.');
 text(s,'price','$12',64,295,430,150,112,C.blue,true);
 text(s,'price-unit','per household / month',70,459,470,44,30,C.navy,true);
 text(s,'hypothesis-label','Pricing hypothesis',70,517,450,34,22,C.muted);
 text(s,'business-benefit','Every helper included',642,303,574,72,39,C.navy,true);
 text(s,'business-rationale','Charging per helper would\ndiscourage participation.',642,394,574,100,29,C.muted);
 text(s,'cost-discipline','Deterministic core rules keep\npaid model calls optional.',642,518,574,89,28,C.navy);
 footer(s,'Pre-pilot. No interviews, paying customers, or revenue claimed.');
 notes(s,'The $12 per household per month price is an unvalidated hypothesis. The market-and-business.md brief proposes testing a $9-15 range after real use. All helpers are included to avoid a seat-pricing incentive against participation. No traction or financial results exist in the materials provided. The Firebase cost brief is arithmetic from declared visible-page polling, query, retention, and allocated-time assumptions. Four 15-minute visible sessions yield 304 refreshes per household/day, with one GET /api/session each. Six document reads per authenticated refresh reflect transactional authorization. The model budgets six reads for every refresh and other API request, plus 20 per MCP action, totaling 2,016 reads per household/day pending telemetry. With the other model assumptions, selected serving charges at five households fit unused allowances, or are about $0.39/month if the shared Cloud Run compute allowance is already consumed. The proposed $10 pilot operating allowance also anticipates deployment resources and uncertainty; it is neither an invoice forecast nor a cap. Billing is enabled. Builds, images, support, acquisition, and optional model calls are separate. Source rates: https://cloud.google.com/run/pricing , https://cloud.google.com/firestore/pricing , https://firebase.google.com/docs/hosting/usage-quotas-pricing . Related category price reference: https://caringvillage.com/pricing/ .');
}
// 7. Planned study and decision metric.
{
 const s=addSlide(7,'Planned household validation','Adoption depends on helpers participating, not only the coordinator signing in.');
 text(s,'interviews-number','10',64,292,375,125,92,C.blue,true);
 text(s,'interviews-label','Planned interviews',64,424,450,48,31,C.navy,true);
 text(s,'interviews-detail','Coordinators, helpers, and\nadults receiving support',64,486,475,86,26,C.muted);
 text(s,'pilot-number','5',698,292,375,125,92,C.blue,true);
 text(s,'pilot-label','Planned households',698,424,518,48,31,C.navy,true);
 text(s,'pilot-detail','Four-week pilot after\na baseline diary',698,486,518,86,26,C.muted);
 text(s,'metric','Primary measure: time to an accepted replacement',64,608,1152,45,29,C.navy,true);
 footer(s,'Also measure follow-up effort, repeated helper use, and voluntary paid continuation.');
 notes(s,'This is a research plan. Ten qualitative interviews include six primary coordinators, two helpers, and two adults receiving support. Five consenting households with at least three participants each would enter a four-week pilot after a baseline diary. Primary metric is time from a cancellation to accepted feasible replacement of all affected commitments. Secondary evidence includes follow-up effort, repeated helper participation, and voluntary paid continuation. Planned targets and detailed limitations are in customer-discovery.md. No interviews or pilots are reported as completed.');
}
// 8. Demo access and next work, with production verification status explicit.
{
 const s=addSlide(8,'The bag-to-ride demo','One cancellation, a feasible split, and responsibility each helper accepts.',true);
 text(s,'next-label','Demo and next steps',64,316,610,52,33,C.white,true);
 linkedText(s,'next-one','Watch the public 2:49 demo','https://youtu.be/t7e00FzIk2M',64,396,780,42,29,C.pale);
 text(s,'next-two','Run the household pilot',64,458,780,42,29,C.pale);
 text(s,'next-three','Complete live Alexa+ onboarding',64,520,780,42,29,C.pale);
 text(s,'contribution-label','Open Source',935,324,281,37,24,C.pale,true);
 const contribution=text(s,'contribution-name','@kindhandoff/guard',935,379,281,88,25,C.white,true);
 contribution.text.get('@kindhandoff/guard').link={uri:GUARD_REPO,isExternal:true};
 text(s,'contribution-role','State transitions\nCoverage + ranking\nMIT license',935,477,281,110,23,C.pale);
 linkedText(s,'repo-link','github.com/shi1720/Amazon-Developer-Hackathon',REPO,64,606,1152,27,18,C.white);
 linkedText(s,'hosted-url',APP_ACCESS_LABEL+': kindhandoff.web.app',APP_URL,64,645,1152,28,17,C.pale);
 notes(s,'Creator: Shivam Gupta. Public MIT main repository: '+REPO+'. Firebase application: '+APP_URL+'. '+'Public workflow verification is documented in the repository evidence.'+' Public English captioned demo: https://youtu.be/t7e00FzIk2M . Signed-out playback and the public transcript were verified by the implementation lead. The additional Open Source contribution is @kindhandoff/guard, public and MIT licensed: '+GUARD_REPO+'. Contribution: '+GUARD_CONTRIBUTION+'. The library covers state transitions, coverage accounting, and candidate ranking. App code owns dependency readiness, exact identity authorization, and content-version acknowledgments. Next steps include household research and live Alexa+ onboarding where access permits. The Devpost entry was submitted to the Build, Ship, Shape: Amazon Developer Hackathon; confirmation was verified on 16 September 2026.');
}

const candidatePath=path.join(buildDir,'KindHandoff-Pitch-candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
execFileSync(RUNTIME_PYTHON,[path.join(sourceDir,'set-pptx-metadata.py'),candidatePath],{stdio:'inherit'});
const revision=Date.now();
const finalPath=path.join(finalizedDir,'KindHandoff-Pitch-'+revision+'.pptx');
const receiptPath=path.join(buildDir,'pitch-validation-'+revision+'.json');
const result=await finalizePresentation({
 workspaceDir,candidatePath,finalPath,pythonExecutable:RUNTIME_PYTHON,
 integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','2','--require-native-table-slide','5'],
 explicitTotalSlideCount:8,requiredNativeTableOwnerSlides:[2,5],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:[family]},verifyArtifactToolImport:true,
 receiptPath
});
await fs.copyFile(finalPath,path.join(outputDir,'KindHandoff-Pitch.pptx'));
await fs.copyFile(receiptPath,path.join(buildDir,'pitch-validation.json'));
await fs.writeFile(path.join(buildDir,'pitch-proto.json'),JSON.stringify(presentation.toProto()));
await fs.writeFile(path.join(buildDir,'pitch-inspect.ndjson'),(await presentation.inspect({kind:'slide,textbox,table,shape',maxChars:100000})).ndjson);
console.log(JSON.stringify({font:family,slideCount:8,delivery:path.join(outputDir,'KindHandoff-Pitch.pptx'),validation:receiptPath,sha256:result.finalSha256},null,2));
