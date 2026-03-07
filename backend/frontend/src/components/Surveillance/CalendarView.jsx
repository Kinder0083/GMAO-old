import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import CompleteSurveillanceDialog from './CompleteSurveillanceDialog';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const getStatusColor = (status) => {
  switch (status) {
    case 'REALISE': return 'bg-green-500';
    case 'PLANIFIE': return 'bg-blue-500';
    case 'PLANIFIER': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

function CalendarView({ items, loading, onEdit, onRefresh }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completeDialog, setCompleteDialog] = useState({ open: false, item: null });

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const itemsByDate = useMemo(() => {
    const grouped = {};
    items.forEach((item) => {
      if (item.prochain_controle) {
        const date = new Date(item.prochain_controle);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          const dateKey = date.toISOString().split('T')[0];
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(item);
        }
      }
    });
    return grouped;
  }, [items, currentMonth, currentYear]);

  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    const days = [];
    for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  };

  const days = getDaysInMonth();

  if (loading) return <div className="text-center p-4">Chargement...</div>;

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold">{MONTHS[currentMonth]} {currentYear}</h2>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <div key={day} className="text-center font-semibold text-sm py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="min-h-[80px]" />;

              const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayItems = itemsByDate[dateKey] || [];
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

              return (
                <div key={day} className={`min-h-[80px] border rounded p-1 ${isToday ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}>
                  <div className="text-sm font-bold mb-1">{day}</div>
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className={`text-xs p-1 mb-1 rounded text-white cursor-pointer flex items-center justify-between ${getStatusColor(item.status)}`}
                      onClick={() => onEdit(item)}
                      title={`${item.classe_type} - ${item.batiment}`}
                    >
                      <span className="truncate flex-1">{item.classe_type.substring(0, 12)}...</span>
                      {item.status !== 'REALISE' && (
                        <CheckCircle className="h-3 w-3 ml-1" onClick={(e) => {
                          e.stopPropagation();
                          setCompleteDialog({ open: true, item });
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-4 justify-center">
            <Badge className="bg-orange-500">À planifier</Badge>
            <Badge className="bg-blue-500">Planifié</Badge>
            <Badge className="bg-green-500">Réalisé</Badge>
          </div>
        </CardContent>
      </Card>

      {completeDialog.open && (
        <CompleteSurveillanceDialog
          open={completeDialog.open}
          item={completeDialog.item}
          onClose={(refresh) => {
            setCompleteDialog({ open: false, item: null });
            if (refresh && onRefresh) onRefresh();
          }}
        />
      )}
    </>
  );
}

export default CalendarView;
