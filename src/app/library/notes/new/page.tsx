import { redirect } from 'next/navigation';

export default function NewNoteRoute() {
  redirect('/notes?new=1');
}
