import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import EmailModal from './EmailModal';

const AllEmailsView = ({ theme }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchEmails();
  }, [page, filter]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/emails?page=${page}&type=${filter}`);
      if (response.data) {
        setEmails(response.data.emails);
        setTotalPages(response.data.total_pages);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>All Emails</h2>
          <p className={theme.textSecondary}>Browse and manage your complete email history</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-4 h-4`} />
            <input
              type="text"
              placeholder="Search emails..."
              className={`pl-10 pr-4 py-2 border ${theme.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-${theme.accent}-500 ${theme.cardBg} ${theme.text}`}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`px-4 py-2 border ${theme.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-${theme.accent}-500 ${theme.cardBg} ${theme.text}`}
          >
            <option value="all">All Types</option>
            <option value="request">Request</option>
            <option value="newsletter">Newsletter</option>
            <option value="personal">Personal</option>
          </select>
        </div>
      </div>

      <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border} flex-1 flex flex-col overflow-hidden`}>
        <div className="overflow-y-auto flex-1">
          <table className="w-full">
            <thead className={`${theme.bg} border-b ${theme.border} sticky top-0`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>Sender</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>Subject</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>Type</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>Date</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.border}`}>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${theme.accent}-500`}></div>
                    </div>
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`hover:${theme.bg} cursor-pointer transition-colors`}
                  >
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme.text}`}>
                      {email.sender}
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme.textSecondary}`}>
                      <div className={`font-medium ${theme.text} mb-1`}>{email.title}</div>
                      <div className={`${theme.textSecondary} truncate max-w-md`}>{email.summary}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${theme.accent}-500/10 ${theme.accentText}`}>
                        {email.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSecondary}`}>
                      {new Date(email.time).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={`px-6 py-4 border-t ${theme.border} flex items-center justify-between ${theme.bg}`}>
          <div className={`text-sm ${theme.textSecondary}`}>
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`p-2 rounded-lg ${theme.secondaryHover} disabled:opacity-50 disabled:cursor-not-allowed ${theme.text}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`p-2 rounded-lg ${theme.secondaryHover} disabled:opacity-50 disabled:cursor-not-allowed ${theme.text}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {selectedEmail && (
        <EmailModal 
          email={selectedEmail} 
          onClose={() => setSelectedEmail(null)} 
          variant="full"
          theme={theme}
        />
      )}
    </div>
  );
};

export default AllEmailsView;
