import { Registry } from '../../core/registry';
import type { Mission } from '../../core/types';
import { m01 } from './m01-patch-tuesday';
import { m02 } from './m02-need-to-know';
import { m03 } from './m03-quiet-one';

/** CURRICULUM: all missions, keyed by id. */
export const missionRegistry = new Registry<Mission>();

for (const m of [m01, m02, m03]) missionRegistry.register(m.id, m);
