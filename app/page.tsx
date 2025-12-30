import Navigation from "./components/Navigation";
import Tabs from "./components/Tabs";
import CompletedTasksList from "./projects/CompletedTasks";
import Tasks from "./projects/TaskList";

export default function Home() {
  return (
    <div className="flex-center-center full-width basic-padding">
      <Tabs 
        tabs={[ 
          { name: "Overview", content: <Tasks tableTitle="All Tasks" /> },
          { name: "Completed", content: <CompletedTasksList></CompletedTasksList> }
        ]} 
      />
    </div>
  );
}