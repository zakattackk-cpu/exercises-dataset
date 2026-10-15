import { ExerciseList } from "../components/ExerciseList";
import { useApp } from "../context";

export function LibraryTab() {
  const { showExercise } = useApp();
  return <ExerciseList onOpen={showExercise} />;
}
