import { degreesToRadians } from 'math';

export const RIG_LENGTH = 2.5;
export const RIG_WAVE_LENGTH = 2.07;
export const RIG_GLIDE_FRICTION = 0.072;
const RIG_MAX_BEND = degreesToRadians(22.5);

export const BODY_SCALE = 3;
export const BODY_FLEX = 0.75;

export const BODY_LENGTH = RIG_LENGTH * BODY_SCALE;
export const BODY_HALF_WIDTH = 0.625 * BODY_SCALE;
export const BODY_HEIGHT = 1.007 * BODY_SCALE;
export const WAVE_LENGTH = RIG_WAVE_LENGTH * BODY_SCALE;
export const TURN_MAX = (RIG_MAX_BEND * BODY_FLEX) / BODY_LENGTH;
