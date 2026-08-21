import type { Track, CurriculumSection } from './types';
import tracksData from '@content/tracks.json';
import curriculumData from '@content/curriculum.json';

export function getTracks(): Track[] {
  return tracksData as Track[];
}

export function getCurriculum(): CurriculumSection[] {
  return (curriculumData as { sections: CurriculumSection[] }).sections;
}
