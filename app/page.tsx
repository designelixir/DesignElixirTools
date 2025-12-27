import Navigation from "./components/Navigation";
import Tasks from "./projects/Tasks";


export default function Home() {
  return (
    <div className="flex-center-center full-width basic-padding">
      <Tasks tableTitle="All Tasks"></Tasks>
    </div>
  );
}
