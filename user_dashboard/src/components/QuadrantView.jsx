import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import EmailModal from './EmailModal';

const QuadrantView = ({ theme }) => {
  const [emails, setEmails] = useState({
    urgent_important: [],
    urgent_not_important: [],
    not_urgent_important: [],
    not_urgent_not_important: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      // Fetch only unread emails for the quadrant view
      const response = await axios.get('/api/emails/categorized?status=unread');
      if (response.data.success) {
        setEmails(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
  };

  const handleCloseModal = () => {
    setSelectedEmail(null);
    // Refresh emails after closing modal in case status changed
    fetchEmails(); 
  };

  const Quadrant = ({ title, items, color, icon: Icon, description }) => (
    <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border} h-full flex flex-col overflow-hidden transition-colors duration-300`}>
      <div className={`p-4 border-b ${theme.border} ${color} bg-opacity-10 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
          <h3 className={`font-bold ${theme.text}`}>{title}</h3>
        </div>
        <span className={`${theme.bg} px-2 py-1 rounded-full text-xs font-bold ${theme.textSecondary} shadow-sm`}>
          {items.length}
        </span>
      </div>
      <div className={`p-2 ${theme.bg} text-xs ${theme.textSecondary} text-center border-b ${theme.border}`}>
        {description}
      </div>
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-${theme.accent}-200 scrollbar-track-transparent hover:scrollbar-thumb-${theme.accent}-300`}>
        {items.map((email) => (
          <div
            key={email.id}
            onClick={() => handleEmailClick(email)}
            className={`${theme.cardBg} p-4 rounded-lg border ${theme.border} shadow-sm hover:shadow-md transition-all cursor-pointer group`}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className={`font-semibold ${theme.text} line-clamp-1 group-hover:text-${theme.accent}-500 transition-colors`}>
                {email.title}
              </h4>
              <span className={`text-xs ${theme.textSecondary} whitespace-nowrap ml-2`}>
                {new Date(email.time).toLocaleDateString()}
              </span>
            </div>
            <p className={`text-sm ${theme.textSecondary} mb-2 line-clamp-2`}>{email.summary}</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 ${theme.bg} rounded-full ${theme.textSecondary}`}>
                {email.sender}
              </span>
              {email.type && (
                <span className={`text-xs px-2 py-1 bg-${theme.accent}-500/10 ${theme.accentText} rounded-full font-medium`}>
                  {email.type}
                </span>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className={`h-full flex flex-col items-center justify-center ${theme.textSecondary} p-8`}>
            <p className="text-sm">No emails in this category</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${theme.accent}-500`}></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${theme.text}`}>Priority Matrix</h2>
        <p className={theme.textSecondary}>Overview of your unread emails categorized by importance and urgency</p>
      </div>
      
      <div className="grid grid-cols-2 gap-6 h-full pb-6">
        <Quadrant
          title="Do First"
          description="Urgent & Important"
          items={emails.urgent_important}
          color="bg-red-500"
          icon={AlertCircle}
        />
        <Quadrant
          title="Schedule"
          description="Important, Not Urgent"
          items={emails.not_urgent_important}
          color="bg-blue-500"
          icon={Clock}
        />
        <Quadrant
          title="Delegate"
          description="Urgent, Not Important"
          items={emails.urgent_not_important}
          color="bg-orange-500"
          icon={CheckCircle}
        />
        <Quadrant
          title="Delete/Later"
          description="Not Urgent & Not Important"
          items={emails.not_urgent_not_important}
          color="bg-gray-500"
          icon={XCircle}
        />
      </div>

      {selectedEmail && (
        <EmailModal email={selectedEmail} onClose={handleCloseModal} theme={theme} />
      )}
    </div>
  );
};

export default QuadrantView;
