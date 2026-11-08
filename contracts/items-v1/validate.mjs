import schema from './schema.json' with { type: 'json' };

export const FORMAT_VERSION = 'items-v1';
const allowedKeywords = new Set(['$ref', 'const', 'enum', 'type', 'pattern', 'minLength', 'minimum', 'maximum', 'minItems', 'items', 'required', 'properties', 'additionalProperties']);
const roots = new Set(['equipment', 'consumables', 'other', 'quests', 'pets']);
const fail = (path, reason) => { throw new Error(`${path}: ${reason}`); };
const typeMatches = (type, value) => type === 'null' ? value === null
  : type === 'array' ? Array.isArray(value)
  : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
  : type === 'integer' ? Number.isSafeInteger(value)
  : typeof value === type;

// Interprets only the keywords used by this frozen schema; unknown keywords fail closed.
function check(rule, value, path) {
  for (const keyword of Object.keys(rule)) if (!allowedKeywords.has(keyword)) fail(path, `unsupported schema keyword ${keyword}`);
  if (rule.$ref) {
    if (!rule.$ref.startsWith('#/$defs/') || !Object.hasOwn(schema.$defs, rule.$ref.slice(8))) fail(path, 'unknown schema reference');
    return check(schema.$defs[rule.$ref.slice(8)], value, path);
  }
  if ('const' in rule && value !== rule.const) fail(path, 'constant mismatch');
  if (rule.enum && !rule.enum.includes(value)) fail(path, 'unsupported value');
  if (rule.type && ![rule.type].flat().some(type => typeMatches(type, value))) fail(path, 'invalid type');
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && [...value].length < rule.minLength) fail(path, 'string too short');
    if (rule.pattern && !new RegExp(rule.pattern, 'u').test(value)) fail(path, 'invalid string');
  }
  if (typeof value === 'number' && ((rule.minimum !== undefined && value < rule.minimum) || (rule.maximum !== undefined && value > rule.maximum))) fail(path, 'number outside range');
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) fail(path, 'array too short');
    if (rule.items) value.forEach((entry, index) => check(rule.items, entry, `${path}[${index}]`));
  }
  if (rule.properties) {
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) fail(path, `missing ${key}`);
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(rule.properties, key)) {
        if (rule.additionalProperties === false) fail(path, `unexpected ${key}`);
      } else check(rule.properties[key], value[key], `${path}.${key}`);
    }
  }
}

export function assertDocument(kind, value) {
  if (!['pointer', 'manifest', 'items'].includes(kind)) fail('$', 'unknown document');
  check(schema.$defs[kind], value, '$');
  if (kind === 'pointer' && value.manifest.path !== `versions/${value.dataVersion}/manifest.json`) fail('$', 'manifest path/version mismatch');
  if (kind === 'manifest') {
    if (value.items.path !== 'items.json') fail('$', 'invalid items path');
    const c = value.coverage;
    if (c.count > c.fullPublicCount) fail('$', 'invalid coverage count');
    if (c.kind === 'full-public' && (c.count !== c.fullPublicCount || c.selection.length !== 0)) fail('$', 'incomplete public coverage');
    if (c.kind === 'producer-test-subset' && (c.selection.length !== c.count || new Set(c.selection).size !== c.count)) fail('$', 'invalid subset selection');
  }
  if (kind === 'items') {
    let previous = 0;
    for (const item of value.items) {
      const id = Number(item.id);
      if (id <= previous || id > 4294967295) fail('$', 'item IDs must be unique and sorted numerically');
      previous = id;
      if ((item.description.status === 'missing') !== (item.description.value === '')) fail(`$.items.${item.id}`, 'description status/value mismatch');
      const category = item.category;
      const first = category.segments[0];
      if (!roots.has(first.key) || first.status !== 'success') fail(`$.items.${item.id}`, 'invalid category root');
      for (const segment of category.segments) {
        if ((segment.status === 'success') !== (typeof segment.label === 'string')) fail(`$.items.${item.id}`, 'category label/status mismatch');
      }
      if ((category.status === 'success') !== category.segments.every(segment => segment.status === 'success')) fail(`$.items.${item.id}`, 'category status/path mismatch');
      if (category.status !== 'success' && category.continuation !== 'unresolved') fail(`$.items.${item.id}`, 'incomplete category cannot declare a rule end');
    }
  }
  return value;
}

// Same UTF-8 canonical identity in Node and the browser; timestamps and paths are absent.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function releaseIdentity(manifest) {
  const { dataVersion: _version, ...identity } = manifest;
  return canonicalJson(identity);
}
