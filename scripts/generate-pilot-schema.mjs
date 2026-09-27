import { getProgramFromFiles, generateSchema } from 'typescript-json-schema';
import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { writeFileSync, mkdirSync } from 'node:fs';

// Build-time code generation: the deployed Worker never needs eval/new Function.
const program = getProgramFromFiles(['src/types/engine.ts'], { strictNullChecks: true, skipLibCheck: true, target: 99, module: 99, moduleResolution: 100, jsx: 4 });
const schema = generateSchema(program, 'EngineState', { required: true, noExtraProps: true, ignoreErrors: false });
if (!schema) throw new Error('Could not generate the engine schema.');
// noExtraProps incorrectly closes the deliberately open event-payload dictionary.
// Preserve its TypeScript index signature; all other engine objects stay strict.
const eventPayload = schema.definitions?.['Record<string,unknown>'];
if (!eventPayload || typeof eventPayload !== 'object') throw new Error('Missing event payload schema; review engine type generation.');
eventPayload.additionalProperties = true;
// This generator loses generic Record<string, T> value types. Explicit index
// signatures preserve both arbitrary IDs and validation of each stored value.
for (const [name, definition] of Object.entries(schema.definitions ?? {})) {
  if (name.startsWith('Record<string,') && definition.additionalProperties === false) {
    throw new Error(`Save dictionary ${name} lost its index signature. Use an explicit typed index signature.`);
  }
}
const ajv = new Ajv({ strict: false, code: { source: true, esm: true } });
const validate = ajv.compile(schema);
mkdirSync('worker/generated', { recursive: true });
writeFileSync('worker/generated/validate-engine.js', standaloneCode(ajv, validate));
writeFileSync('worker/generated/validate-engine.d.ts', "import type { EngineState } from '../../src/types/engine';\ndeclare const validate: (data: unknown) => data is EngineState;\nexport default validate;\n");
console.log('Generated strict pilot save validator from EngineState.');
