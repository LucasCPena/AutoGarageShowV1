import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

interface CalendarEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  city: string;
  state: string;
  location: string;
  startAt: string;
  endAt?: string;
  status: 'pending' | 'approved' | 'completed';
  recurrence: any;
  websiteUrl?: string;
  coverImage?: string;
  images?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  dates?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    let events = await db.events.getAll();
    
    // Filtrar apenas eventos aprovados
    events = events.filter(event => event.status === 'approved');
    
    // Gerar eventos recorrentes
    const allEvents: CalendarEvent[] = [...events];
    
    for (const event of events) {
      if (event.recurrence.type !== 'single') {
        const recurringEvents = generateRecurringEvents(event, year ? parseInt(year) : undefined);
        allEvents.push(...recurringEvents);
      }
    }
    
    // Filtrar por mês se especificado
    if (year && month) {
      const targetYear = parseInt(year);
      const targetMonth = parseInt(month) - 1; // JavaScript months are 0-indexed
      
      allEvents.forEach(event => {
        if (event.dates) {
          event.dates = event.dates.filter((date: string) => {
            const eventDate = new Date(date);
            return eventDate.getFullYear() === targetYear && eventDate.getMonth() === targetMonth;
          });
        }
      });
    }
    
    return NextResponse.json({ events: allEvents });
  } catch (error) {
    console.error('Erro ao buscar calendário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

function generateRecurringEvents(event: CalendarEvent, targetYear?: number): CalendarEvent[] {
  const recurringEvents: CalendarEvent[] = [];
  const startDate = new Date(event.startAt);
  const endDate = event.endAt ? new Date(event.endAt) : startDate;
  const duration = endDate.getTime() - startDate.getTime();
  
  let currentDate = new Date(startDate);
  const maxYear = targetYear || (new Date().getFullYear() + 2);
  
  switch (event.recurrence.type) {
    case 'weekly':
      const weeksToGenerate = event.recurrence.generateWeeks || 52;
      for (let i = 0; i < weeksToGenerate; i++) {
        if (currentDate.getFullYear() > maxYear) break;
        
        const eventEnd = new Date(currentDate.getTime() + duration);
        recurringEvents.push({
          ...event,
          id: `${event.id}-weekly-${i}`,
          dates: [currentDate.toISOString()],
          startAt: currentDate.toISOString(),
          endAt: eventEnd.toISOString()
        });
        
        currentDate.setDate(currentDate.getDate() + 7);
      }
      break;
      
    case 'monthly':
      const monthsToGenerate = event.recurrence.generateMonths || 24;
      for (let i = 0; i < monthsToGenerate; i++) {
        if (currentDate.getFullYear() > maxYear) break;
        
        const eventEnd = new Date(currentDate.getTime() + duration);
        recurringEvents.push({
          ...event,
          id: `${event.id}-monthly-${i}`,
          dates: [currentDate.toISOString()],
          startAt: currentDate.toISOString(),
          endAt: eventEnd.toISOString()
        });
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      break;
      
    case 'annual':
      const yearsToGenerate = event.recurrence.generateYears || 5;
      for (let i = 0; i < yearsToGenerate; i++) {
        if (currentDate.getFullYear() > maxYear) break;
        
        const eventEnd = new Date(currentDate.getTime() + duration);
        recurringEvents.push({
          ...event,
          id: `${event.id}-annual-${i}`,
          dates: [currentDate.toISOString()],
          startAt: currentDate.toISOString(),
          endAt: eventEnd.toISOString()
        });
        
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }
      break;
      
    case 'specific':
      if (event.recurrence.dates) {
        event.recurrence.dates.forEach((date: string, index: number) => {
          const eventDate = new Date(date);
          if (targetYear && eventDate.getFullYear() !== targetYear) return;
          
          const eventEnd = new Date(eventDate.getTime() + duration);
          recurringEvents.push({
            ...event,
            id: `${event.id}-specific-${index}`,
            dates: [date],
            startAt: date,
            endAt: eventEnd.toISOString()
          });
        });
      }
      break;
  }
  
  return recurringEvents;
}
