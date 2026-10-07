/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hooks isolate services without database access. */
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename, load = Module._load;
const users = new Map();
let transactions = 0, sessions = 0, raceError;
const prisma = {
  user: {
    findUnique: async ({where}) => users.get(where.email) ?? null,
    create: async ({data}) => { const user = {...data, id:`user-${users.size}`}; users.set(data.email,user); return user; },
  },
  organization: {create:async ({data}) => ({...data,id:'test-org'})},
  clientAccount: {create:async ({data}) => ({...data,id:'test-client'}), findMany:async () => []},
  clientAssignment: {create:async () => ({})},
  auditLog: {create:async () => ({})},
  authSession: {create:async () => {sessions++; return {}; }},
  $transaction: async callback => {transactions++; if(raceError) throw raceError; return callback(prisma);},
};
Module._resolveFilename = function(name,parent,main,options){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,main,options);};
Module._load = function(name,parent,main){return name === '@/lib/db/prisma' ? {prisma} : load.call(this,name,parent,main);};
require.extensions['.ts'] = (mod,filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const {isValidEmail,isValidNewPassword} = require('../src/lib/auth/credential-policy.ts');
const {signUp,signIn,hashPassword} = require('../src/lib/auth/auth-service.ts');
const {createManagedUser} = require('../src/lib/admin/admin-service.ts');
async function main(){
  for(const email of ['owner@example.com','first.last+tag@sub.example.co.uk']) assert.equal(isValidEmail(email),true,email);
  for(const email of ['missing-at','a@@example.com','a@example','a@-example.com','a@example..com','a..b@example.com','.a@example.com','a@exam_ple.com','a@ example.com','a'.repeat(65)+'@example.com']) assert.equal(isValidEmail(email),false,email);
  assert.equal(isValidNewPassword('Abcd1!x'),true);
  for(const password of ['Abc1!','abcdef1!','Abcdefg!','Abcdefg1','Abcdef1 ','A1!'+'a'.repeat(126)]) assert.equal(isValidNewPassword(password),false);
  const input = {accountType:'ADMIN',workspace:'Test workspace',email:'  Owner@Example.com  ',password:'Abcd1!x'};
  for(const patch of [{email:'bad-address'},{password:'abcdef1!'},{password:'Abcdefg1'},{workspace:'x'}]) await assert.rejects(signUp({...input,...patch}),error=>error.code==='INVALID_SIGNUP' && error.status===422);
  assert.equal(transactions,0); assert.equal(sessions,0);
  const result = await signUp(input);
  assert.equal(result.user.email,'owner@example.com'); assert.equal(sessions,1);
  assert.notEqual(users.get('owner@example.com').passwordHash,input.password);
  const before = transactions;
  await assert.rejects(signUp(input),error=>error.code==='EMAIL_IN_USE' && error.safeMessage.includes('already exists'));
  assert.equal(transactions,before);
  raceError = {code:'P2002',meta:{target:['email']}};
  await assert.rejects(signUp({...input,email:'race@example.com'}),error=>error.code==='EMAIL_IN_USE');
  raceError = {code:'P2002',meta:{modelName:'ClientAccount',target:['id']}};
  await assert.rejects(signUp({...input,email:'other@example.com'}),error=>error===raceError);
  raceError = undefined;
  assert.equal((await signIn({email:' OWNER@example.com ',password:input.password,workspaceRole:'ADMIN'})).user.email,'owner@example.com');
  await assert.rejects(signIn({email:'owner@example.com',password:'wrong',workspaceRole:'ADMIN'}),error=>error.code==='INVALID_CREDENTIALS');
  await assert.rejects(signIn({email:'owner@example.com',password:input.password,workspaceRole:'AGENT'}),error=>error.status===403);
  const legacy = {id:'legacy',organizationId:'test-org',email:'legacy@example.com',name:'Legacy',role:'AGENT',status:'ACTIVE',passwordHash:await hashPassword('legacy')};
  users.set(legacy.email,legacy);
  assert.equal((await signIn({email:legacy.email,password:'legacy',workspaceRole:'AGENT'})).user.id,'legacy');
  const admin = result.user;
  for(const patch of [{email:'bad-address'},{password:'abcdef1!'}]) await assert.rejects(createManagedUser(admin,{name:'Agent',email:'agent@example.com',password:'Abcd1!x',role:'AGENT',...patch}),error=>error.code==='INVALID_USER_INPUT');
  const agent = await createManagedUser(admin,{name:'Agent',email:'agent@example.com',password:'Abcd1!x',role:'AGENT'});
  assert.equal(agent.role,'AGENT');
  console.log('PASS email format, seven-character password complexity, signup and managed-user enforcement, hashing/login, existing passwords, role isolation and duplicate/racing signup errors. No database or email service used.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
