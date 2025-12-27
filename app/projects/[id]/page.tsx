'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Project } from '@/types/globalTypes';
import Link from 'next/link';
import Image from 'next/image';
import EditProject from '../EditProject';
import Tasks from '../Tasks';
import TimeTrackedList from '@/app/time-tracking/TimeTrackedList';

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [params.id]);

  const loadProject = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpdated = () => {
    loadProject();
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div className='full-width basic-padding'>
      <h3 className='no-text-spacing'>
        <Link href="/projects" className="no-link-styling">PROJECTS</Link>
      </h3>

      <div className="flex-center-spacebetween flex-wrap full-width" style={{ marginBottom: '20px' }}>
        <div className='flex-start-start flex-column full-width' style={{ minWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            {project.client_image && (
              <Image 
                src={project.client_image} 
                alt={project.project_name}
                width={60}
                height={60}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
            <div
              className="circle"
              style={{ 
                backgroundColor: project.color || '#CCCCCC',
                width: '20px',
                height: '20px'
              }}
            />
            <h1 style={{ margin: 0 }}>{project.project_name}</h1>
            {!project.active && (
              <span style={{ 
                fontSize: '14px', 
                color: '#ff9800',
                padding: '4px 12px',
                backgroundColor: '#fff3e0',
                borderRadius: '12px'
              }}>
                Inactive
              </span>
            )}
          </div>

          <Link 
            href={`/client-list/${project.client_id}`}
            className='flex-center-start no-link-styling contact-link'
          >
            <Image src="/user.svg" alt="client icon" width={20} height={20} style={{ marginRight: '10px' }} />
            {project.client_first} {project.client_last}
          </Link>

          {project.hourly_rate && (
            <div style={{ marginTop: '5px', color: '#666' }}>
              <strong>Rate:</strong> ${project.hourly_rate}/hr
            </div>
          )}

          {project.deadline && (
            <div style={{ marginTop: '5px', color: '#666' }}>
              <strong>Deadline:</strong> {formatDate(project.deadline)}
            </div>
          )}

          {project.last_active && (
            <div style={{ marginTop: '5px', color: '#666' }}>
              <strong>Last Active:</strong> {formatDate(project.last_active)}
            </div>
          )}

          <div style={{ marginTop: '5px', color: '#999', fontSize: '12px' }}>
            Created {formatDate(project.created_at)}
          </div>
        </div>

        <div className='flex-end-end full-width'>
          <EditProject projectId={project.id} onProjectUpdated={handleProjectUpdated} />
        </div>
      </div>

      <hr />

      <div style={{ marginBottom: '30px' }}>
        <h2>Tasks</h2>
        <Tasks clientId={project.client_id} projectId={project.id} />
      </div>

      <hr />

      <div style={{ marginBottom: '30px' }}>
        <h2>Time Tracking</h2>
        <TimeTrackedList 
          filterProjectIds={[project.id]}
          billableRate={project.hourly_rate}
          showCalculations={true}
          allowProjectSelection={false}
        />
      </div>
    </div>
  );
}