import { PROJECTS } from '@/constants/projects';
import { TECH_STACK, SKILL_DETAILS } from '@/constants/skills';
import { EXPERIENCE } from '@/constants/experience';
import { layoutBooks } from './books';

// The books on the living room shelf, worked out once from the data files.
export const BOOKS = layoutBooks(TECH_STACK, SKILL_DETAILS, PROJECTS, EXPERIENCE);

export const bookFor = (skill) => BOOKS.find((b) => b.skill === skill) ?? null;
