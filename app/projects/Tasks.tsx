'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Task, Client, Project } from '@/types/globalTypes';
import SelectableCalendar from '../components/SelectableCalendar';
import EditTask from './EditTask';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import { SelectedClientData } from '@/types/globalTypes';
import { table } from 'console';

interface TasksProps {
  clientId?: string;
  projectId?: string;
  showCreateButton?: boolean;
  tableTitle?: string;
}

interface TaskWithDetails extends Task {
  clientName?: string;
  projectName?: string;
  projectColor?: string;
}

export default function Tasks({ clientId, projectId, tableTitle, showCreateButton = true }: TasksProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTask, setNewTask] = useState({
    task_name: '',
    task_notes: '',
    task_deadline: '',
    task_priority: '',
    task_status: 'pending',
    client_id: clientId || '',
    project_id: projectId || ''
  });
  const [newTaskClient, setNewTaskClient] = useState<SelectedClientData | null>(null);

  const hasFixedClientProject = !!clientId && !!projectId;

  useEffect(() => {
    fetchTasks();
  }, [clientId, projectId]);

  const fetchTasks = async () => {
  setLoading(true);
  try {
    const supabase = createClient();
    let query = supabase
      .from('tasks')
      .select('*')
      .order('task_active', { ascending: false })
      .order('task_deadline', { ascending: true, nullsFirst: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    console.log('Raw tasks:', data); // Debug log

    // Fetch client and project details for each task
    const tasksWithDetails = await Promise.all(
      (data || []).map(async (task) => {
        let clientName = '';
        let projectName = '';
        let projectColor = '';

        console.log('Processing task:', task.task_id, 'client_id:', task.client_id, 'project_id:', task.project_id); // Debug log

        if (task.client_id) {
          const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('client_first, client_last')
            .eq('id', task.client_id)
            .single();

          console.log('Client lookup result:', client, clientError); // Debug log

          if (client && !clientError) {
            clientName = `${client.client_first} ${client.client_last}`;
          }
        }

        if (task.project_id) {
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('project_name, color')
            .eq('id', task.project_id)
            .single();

          console.log('Project lookup result:', project, projectError); // Debug log

          if (project && !projectError) {
            projectName = project.project_name;
            projectColor = project.color || '#CCCCCC';
          }
        }

        console.log('Final task details:', { clientName, projectName, projectColor }); // Debug log

        return {
          ...task,
          clientName,
          projectName,
          projectColor
        };
      })
    );

    console.log('Tasks with details:', tasksWithDetails); // Debug log
    setTasks(tasksWithDetails);
  } catch (err) {
    console.error('Error fetching tasks:', err);
  } finally {
    setLoading(false);
  }
};

  const handleSelectAll = () => {
    const activeTasks = tasks.filter(t => t.task_active !== false);
    if (selectedTasks.length === activeTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(activeTasks.map(t => t.task_id));
    }
  };

  const handleSelectTask = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const handleMarkAsComplete = async () => {
    if (selectedTasks.length === 0) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({ task_active: false, task_status: 'completed' })
        .in('task_id', selectedTasks);

      if (error) throw error;
      
      setSelectedTasks([]);
      fetchTasks();
    } catch (err) {
      console.error('Error marking tasks as complete:', err);
    }
  };

  const handleToggleActive = async (taskId: string, currentActive: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({ 
          task_active: !currentActive,
          task_status: !currentActive ? 'pending' : 'completed'
        })
        .eq('task_id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  const handleDeadlineChange = async (taskId: string, newDate: Date | null) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({
          task_deadline: newDate ? newDate.toISOString().split('T')[0] : null
        })
        .eq('task_id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error('Error updating deadline:', err);
    }
  };

  const handleAddNewTask = () => {
    setIsAddingNew(true);
    setNewTask({
      task_name: '',
      task_notes: '',
      task_deadline: '',
      task_priority: '',
      task_status: 'pending',
      client_id: clientId || '',
      project_id: projectId || ''
    });
    setNewTaskClient(null);
  };

  const handleSaveNewTask = async () => {
    if (!newTask.task_name.trim()) {
      alert('Task name is required');
      return;
    }

    if (!hasFixedClientProject && !newTaskClient) {
      alert('Please select a client and project');
      return;
    }

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from('tasks')
        .insert([{
          task_name: newTask.task_name,
          client_id: hasFixedClientProject ? clientId : newTaskClient?.client_id,
          project_id: hasFixedClientProject ? projectId : newTaskClient?.project_id,
          task_notes: newTask.task_notes || null,
          task_deadline: newTask.task_deadline || null,
          task_priority: newTask.task_priority ? parseInt(newTask.task_priority) : null,
          task_status: newTask.task_status,
          task_active: true
        }]);

      if (insertError) throw insertError;

      setIsAddingNew(false);
      setNewTask({
        task_name: '',
        task_notes: '',
        task_deadline: '',
        task_priority: '',
        task_status: 'pending',
        client_id: clientId || '',
        project_id: projectId || ''
      });
      setNewTaskClient(null);
      fetchTasks();
    } catch (err: any) {
      console.error('Error creating task:', err);
      alert(err.message || 'Failed to create task');
    }
  };

  const handleCancelNewTask = () => {
    setIsAddingNew(false);
    setNewTask({
      task_name: '',
      task_notes: '',
      task_deadline: '',
      task_priority: '',
      task_status: 'pending',
      client_id: clientId || '',
      project_id: projectId || ''
    });
    setNewTaskClient(null);
  };

  const formatDeadline = (deadline: string | null): string => {
    if (!deadline) return 'No deadline';
    
    const date = new Date(deadline);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    
    const suffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${month} ${day}${suffix(day)}, ${year}`;
  };

  const getDaysTillDeadline = (deadline: string | null): string => {
    if (!deadline) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const getDeadlineColor = (deadline: string | null): string => {
    if (!deadline) return '#666';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '#ff0000';
    if (diffDays <= 3) return '#ff9800';
    return '#4CAF50';
  };

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <div className='flex-start-start flex-column full-width'>
      <div className='full-width'>
        <div className='flex-center-start full-width'>
            {tableTitle ? (
                <h3 className='full-width'>{tableTitle}</h3>
            ):(
            <span className='full-width'></span>
            )}
        {showCreateButton && !isAddingNew && (
          <button onClick={handleAddNewTask}>
            + Add Task
          </button>
        )}
        </div>
        {selectedTasks.length > 0 && (
          <button 
            onClick={handleMarkAsComplete}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Mark as Complete ({selectedTasks.length})
          </button>
        )}
      </div>

      {tasks.length === 0 && !isAddingNew ? (
        <div>No tasks found.</div>
      ) : (
        <table className='full-width'>
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox"
                  checked={tasks.filter(t => t.task_active !== false).length > 0 && 
                           selectedTasks.length === tasks.filter(t => t.task_active !== false).length}
                  onChange={handleSelectAll}
                />
              </th>
              {!hasFixedClientProject && <th>Client/Project</th>}
              <th>Task</th>
              <th>Notes</th>
              <th>Deadline</th>
              <th>Time Left</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Active</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {isAddingNew && (
              <tr style={{ backgroundColor: '#f0f8ff' }}>
                <td></td>
                {!hasFixedClientProject && (
                  <td>
                    <SearchAndSelectClient
                      selectedClient={newTaskClient}
                      onClientSelect={setNewTaskClient}
                    />
                  </td>
                )}
                <td>
                  <input
                    type="text"
                    placeholder="Task name *"
                    value={newTask.task_name}
                    onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                    style={{ width: '100%', padding: '4px' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Notes"
                    value={newTask.task_notes}
                    onChange={(e) => setNewTask({ ...newTask, task_notes: e.target.value })}
                    style={{ width: '100%', padding: '4px' }}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={newTask.task_deadline}
                    onChange={(e) => setNewTask({ ...newTask, task_deadline: e.target.value })}
                    style={{ width: '100%', padding: '4px' }}
                  />
                </td>
                <td></td>
                <td>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="1-10"
                    value={newTask.task_priority}
                    onChange={(e) => setNewTask({ ...newTask, task_priority: e.target.value })}
                    style={{ width: '60px', padding: '4px' }}
                  />
                </td>
                <td>
                  <select
                    value={newTask.task_status}
                    onChange={(e) => setNewTask({ ...newTask, task_status: e.target.value })}
                    style={{ width: '100%', padding: '4px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </td>
                <td></td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={handleSaveNewTask} style={{ padding: '4px 8px' }}>Save</button>
                    <button onClick={handleCancelNewTask} className="system-button" style={{ padding: '4px 8px' }}>Cancel</button>
                  </div>
                </td>
              </tr>
            )}
            {tasks.map((task) => (
              <tr key={task.task_id} style={{ opacity: task.task_active === false ? 0.5 : 1 }}>
                <td>
                  <input 
                    type="checkbox"
                    checked={selectedTasks.includes(task.task_id)}
                    onChange={() => handleSelectTask(task.task_id)}
                    disabled={task.task_active === false}
                  />
                </td>
                {!hasFixedClientProject && (
                  <td>
                    {task.clientName || task.projectName ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {task.clientName && (
                          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                            {task.clientName}
                          </div>
                        )}
                        {task.projectName && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: task.projectColor || '#CCCCCC'
                              }}
                            />
                            <span style={{ fontSize: '11px' }}>{task.projectName}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#999' }}>No client/project</span>
                    )}
                  </td>
                )}
                <td>
                  <strong>{task.task_name}</strong>
                </td>
                <td style={{ fontSize: '12px', color: '#666' }}>
                  {task.task_notes || '-'}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SelectableCalendar
                      value={task.task_deadline ? new Date(task.task_deadline) : null}
                      onChange={(date) => handleDeadlineChange(task.task_id, date)}
                      label="Deadline"
                    />
                    {task.task_deadline ? (
                      <span style={{ color: getDeadlineColor(task.task_deadline) }}>
                        {formatDeadline(task.task_deadline)}
                      </span>
                    ) : (
                      <span>No deadline set</span>
                    )}
                  </div>
                </td>
                <td>
                  {task.task_deadline ? (
                    <span style={{ 
                      color: getDeadlineColor(task.task_deadline),
                      fontWeight: 'bold'
                    }}>
                      {getDaysTillDeadline(task.task_deadline)}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td>
                  {task.task_priority ? (
                    <span 
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        backgroundColor: task.task_priority >= 8 ? '#ffebee' : 
                                        task.task_priority >= 5 ? '#fff3e0' : '#e8f5e9',
                        color: task.task_priority >= 8 ? '#c62828' : 
                               task.task_priority >= 5 ? '#ef6c00' : '#2e7d32'
                      }}
                    >
                      {task.task_priority}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td>{task.task_status}</td>
                <td>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={task.task_active !== false}
                      onChange={() => handleToggleActive(task.task_id, task.task_active !== false)}
                    />
                    <span className="slider"></span>
                  </label>
                </td>
                <td>
                  <EditTask task={task} onTaskUpdated={fetchTasks} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}