import React, { useState } from 'react';
import { Download, Printer, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { timetableService } from '../services/api';

export const ExportPage: React.FC = () => {
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handleExportCSV = async () => {
    setExportingFormat('csv');
    try {
      const entries = await timetableService.getAll();
      const csvRows = ['ID,Class,Subject,Teacher,Type,Day,Period,Resource,Batch'];

      entries.forEach(e => {
        csvRows.push(
          `"${e.id}","${e.classId}","${e.subjectId}","${e.teacherId}","${e.sessionType}","${e.day}",${e.periodIndex},"${e.resourceId}","${e.batchName || ''}"`
        );
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `college_timetable_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportJSON = async () => {
    setExportingFormat('json');
    try {
      const entries = await timetableService.getAll();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', `college_timetable_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Download className="w-6 h-6 text-indigo-400" />
          <span>Export & Print Timetables</span>
        </h1>
        <p className="text-xs text-slate-400">
          Export college schedules for printing, Excel integration, or administrative archive.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Print Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">Browser Print / PDF</h2>
            <p className="text-xs text-slate-400">
              Print high-resolution weekly timetable grids formatted for notice boards and faculty desks.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            Launch Print Dialog
          </button>
        </div>

        {/* CSV Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">Export to CSV / Excel</h2>
            <p className="text-xs text-slate-400">
              Download comma-separated dataset containing all scheduled sessions, batch names, and venue allocations.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={exportingFormat === 'csv'}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            {exportingFormat === 'csv' ? 'Generating CSV...' : 'Download CSV File'}
          </button>
        </div>

        {/* JSON Archive */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">Full JSON Backup</h2>
            <p className="text-xs text-slate-400">
              Backup structured timetable dataset for database migration or programmatic REST consumption.
            </p>
          </div>

          <button
            onClick={handleExportJSON}
            disabled={exportingFormat === 'json'}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all disabled:opacity-50"
          >
            {exportingFormat === 'json' ? 'Exporting JSON...' : 'Download JSON Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
