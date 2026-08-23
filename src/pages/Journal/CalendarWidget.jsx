import React from 'react';
import './Journal.css';

export default function CalendarWidget({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="calendar-widget">
      <h3 className="calendar-title">📅 Agenda Amoreja</h3>
      <ul className="calendar-list">
        {events.map(evt => {
          const dateObj = new Date(evt.event_date);
          const day = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          const time = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          
          return (
            <li key={evt.id} className="calendar-item">
              <div className="calendar-date">
                <span className="cal-day">{day.split(' de ')[0]}</span>
                <span className="cal-month">{day.split(' de ')[1] || day}</span>
              </div>
              <div className="calendar-details">
                <strong>{evt.title}</strong>
                <span className="cal-time">{time}</span>
                {evt.social_links && evt.social_links.length > 0 && (
                  <a href={evt.social_links[0].url} target="_blank" rel="noreferrer" className="cal-link">
                    Ver mais
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
