import React from 'react';

interface Report {
    id: string;
    title: string;
    date: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    type: string;
}

interface ReportListProps {
    reports: Report[];
    onDownload: (id: string) => void;
    onView: (id: string) => void;
}

export const ReportList = ({ reports, onDownload, onView }: ReportListProps) => {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-12 px-6 py-3 text-[10px] uppercase tracking-widest font-mono font-bold text-slate-400 border-b border-slate-100 dark:border-white/5">
                <div className="col-span-6">Report Name</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Actions</div>
            </div>

            {reports.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                    <p className="text-sm text-slate-400 font-medium">No reports generated yet.</p>
                </div>
            ) : (
                reports.map((report) => (
                    <div
                        key={report.id}
                        className="grid grid-cols-12 items-center px-6 py-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300 group shadow-sm hover:shadow-md"
                    >
                        <div className="col-span-6 flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                {report.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">
                                Ref: {report.id}
                            </span>
                        </div>

                        <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
                            {report.date}
                        </div>

                        <div className="col-span-2">
                            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold tracking-tighter uppercase ${report.status === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                }`}>
                                {report.status}
                            </span>
                        </div>

                        <div className="col-span-2 flex justify-end space-x-2">
                            <button
                                onClick={() => onView(report.id)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                                title="View Digital Report"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onDownload(report.id)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                                title="Download PDF"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
