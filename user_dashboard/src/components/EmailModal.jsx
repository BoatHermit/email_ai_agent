import React, { useState } from 'react';
import { 
  X, User, Calendar, Tag, FileText, Hash, 
  Reply, HelpCircle, CheckSquare, Bell, Forward, Archive, Ban, Copy, Check
} from 'lucide-react';
import axios from 'axios';

const ACTION_REGISTRY = {
  "reply": { zh_name: "回复邮件", icon: Reply, hasTemplate: true },
  "ask_clarification": { zh_name: "追问澄清", icon: HelpCircle, hasTemplate: true },
  "schedule_meeting": { zh_name: "安排会议/事件", icon: Calendar, hasTemplate: false },
  "create_todo": { zh_name: "创建待办任务", icon: CheckSquare, hasTemplate: false },
  "set_reminder": { zh_name: "设置提醒", icon: Bell, hasTemplate: false },
  "forward": { zh_name: "转发处理/升级", icon: Forward, hasTemplate: true },
  "archive_or_ignore": { zh_name: "归档/忽略", icon: Archive, hasTemplate: false },
  "unsubscribe": { zh_name: "退订邮件", icon: Ban, hasTemplate: false }
};

const ActionItem = ({ action, theme }) => {
  const config = ACTION_REGISTRY[action.action_type_key];
  const Icon = config?.icon || FileText;
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  // Prioritize template_body, fallback to content
  const [content, setContent] = useState(action.template_body || action.content || '');
  const subject = action.template_subject;

  const handleCopyBody = () => {
    navigator.clipboard.writeText(content);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  if (!config) return null;

  return (
    <div className={`${theme.bg} rounded-xl border ${theme.border} overflow-hidden`}>
      <div className={`p-4 border-b ${theme.border} flex items-start justify-between bg-opacity-50 ${theme.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 ${theme.cardBg} rounded-lg shadow-sm ${theme.accentText}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className={`font-bold ${theme.text}`}>{config.zh_name}</h4>
            <p className={`text-sm ${theme.accentText} font-medium`}>{action.title}</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <p className={`text-sm ${theme.textSecondary}`}>{action.description}</p>
        
        {config.hasTemplate && (
          <div className="mt-3 space-y-3">
            
            {subject && (
              <div className="relative group">
                <div className={`text-xs font-semibold ${theme.textSecondary} mb-1 uppercase`}>Subject</div>
                <div className="flex gap-2">
                  <div className={`flex-1 px-3 py-2 ${theme.cardBg} border ${theme.border} rounded-lg text-sm ${theme.text} font-medium`}>
                    {subject}
                  </div>
                  <button
                    onClick={handleCopySubject}
                    className={`flex-shrink-0 p-2 ${theme.cardBg} border ${theme.border} ${theme.secondaryHover} rounded-lg ${theme.textSecondary} transition-colors`}
                    title="Copy subject"
                  >
                    {copiedSubject ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <div className={`text-xs font-semibold ${theme.textSecondary} uppercase`}>Draft Content</div>
                <button
                  onClick={handleCopyBody}
                  className={`flex items-center gap-1.5 px-2 py-1 ${theme.cardBg} border ${theme.border} rounded-md text-xs font-medium ${theme.accentText} ${theme.secondaryHover} transition-colors`}
                  title="Copy content"
                >
                  {copiedBody ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedBody ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full h-48 p-3 text-sm border ${theme.border} rounded-lg focus:ring-2 focus:ring-${theme.accent}-500 focus:border-transparent resize-none ${theme.cardBg} ${theme.text} font-mono leading-relaxed`}
                placeholder="Draft content..."
              />
            </div>
          </div>
        )}

        {!config.hasTemplate && content && (
           <div className="mt-3">
             <div className={`text-xs font-semibold ${theme.textSecondary} mb-1 uppercase`}>Details</div>
             <div className={`${theme.cardBg} p-3 rounded-lg border ${theme.border} text-sm ${theme.text} whitespace-pre-wrap font-mono`}>
                {content}
             </div>
           </div>
        )}

        {!config.hasTemplate && !content && (
           <div className={`${theme.cardBg} p-3 rounded-lg border ${theme.border} text-sm ${theme.textSecondary} italic`}>
             Action details: {action.title}
           </div>
        )}
      </div>
    </div>
  );
};

const EmailModal = ({ email, onClose, variant = 'default', theme }) => {
  if (!email) return null;
  const [isRead, setIsRead] = useState(email.is_read);
  const isFullView = variant === 'full';

  const handleMarkAsRead = async () => {
    try {
      await axios.post(`/api/emails/${email.id}/read`);
      setIsRead(true);
      onClose(); // Close modal to refresh parent view
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Filter valid actions
  const validActions = (email.actions || []).filter(a => ACTION_REGISTRY[a.action_type_key]);
  const hasActions = validActions.length > 0;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`${theme.cardBg} rounded-2xl shadow-2xl w-full ${isFullView ? 'max-w-6xl' : 'max-w-2xl'} max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b ${theme.border} flex justify-between items-start ${theme.bg}`}>
          <div className="flex-1 pr-8">
            <h2 className={`text-xl font-bold ${theme.text} mb-2`}>{email.title}</h2>
            <div className={`flex flex-wrap gap-4 text-sm ${theme.textSecondary}`}>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{email.sender}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(email.time).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 ${theme.secondaryHover} rounded-full transition-colors`}
          >
            <X className={`w-6 h-6 ${theme.textSecondary}`} />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 p-6 ${isFullView ? 'flex gap-8 overflow-hidden' : 'overflow-y-auto space-y-6'}`}>
          
          {/* Left Column (Full View) or Main Content (Default View) */}
          <div className={`flex-1 ${isFullView ? 'overflow-y-auto pr-2' : 'space-y-6'}`}>
            {/* Tags Section - Always visible here for Default, moved to right for Full */}
            {!isFullView && (
              <div className="flex flex-wrap gap-2 mb-6">
                <div className={`flex items-center gap-2 px-3 py-1.5 bg-${theme.accent}-500/10 ${theme.accentText} rounded-full text-sm font-medium`}>
                  <Tag className="w-4 h-4" />
                  {email.type}
                </div>
                {email.quadrant && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-full text-sm font-medium`}>
                    <Hash className="w-4 h-4" />
                    {email.quadrant.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            )}

            {/* Full Content Preview */}
            {email.content && (
              <div className={`${!isFullView && email.content !== email.summary ? `border-t ${theme.border} pt-6` : ''}`}>
                <h3 className={`text-sm font-semibold ${theme.textSecondary} mb-3 uppercase tracking-wider`}>
                  {isFullView ? 'Email Content' : (email.content !== email.summary ? 'Content Preview' : '')}
                </h3>
                <div className={`prose prose-sm max-w-none ${theme.text} whitespace-pre-wrap font-sans leading-relaxed`}>
                  {email.content}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Full View) or Stacked (Default View) */}
          <div className={`${isFullView ? `w-[400px] flex-shrink-0 space-y-6 overflow-y-auto pl-6 border-l ${theme.border}` : 'contents'}`}>
            
            {/* Tags Section (Full View Only) */}
            {isFullView && (
              <div className="flex flex-wrap gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 bg-${theme.accent}-500/10 ${theme.accentText} rounded-full text-sm font-medium`}>
                  <Tag className="w-4 h-4" />
                  {email.type}
                </div>
                {email.quadrant && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-full text-sm font-medium`}>
                    <Hash className="w-4 h-4" />
                    {email.quadrant.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            )}

            {/* Summary Section */}
            <div className={`bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20`}>
              <h3 className="text-sm font-bold text-yellow-600 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                AI Summary
              </h3>
              <p className={`${theme.text} leading-relaxed text-sm`}>{email.summary}</p>
            </div>

            {/* Keywords */}
            {email.keywords && email.keywords.length > 0 && (
              <div>
                <h3 className={`text-sm font-semibold ${theme.textSecondary} mb-3 uppercase tracking-wider`}>Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {email.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 ${theme.bg} ${theme.textSecondary} rounded-lg text-xs hover:opacity-80 transition-colors`}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Section */}
            {hasActions && (
              <div className="space-y-4">
                <h3 className={`text-sm font-bold ${theme.text} uppercase tracking-wider flex items-center gap-2`}>
                  <CheckSquare className="w-4 h-4" />
                  Suggested Actions
                </h3>
                <div className="grid gap-4">
                  {validActions.map((action, idx) => (
                    <ActionItem key={idx} action={action} theme={theme} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${theme.border} ${theme.bg} flex justify-end gap-3`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 ${theme.cardBg} border ${theme.border} ${theme.text} rounded-lg ${theme.secondaryHover} font-medium transition-colors`}
          >
            Close
          </button>
          {!isRead && !isFullView && (
            <button
              onClick={handleMarkAsRead}
              className={`px-4 py-2 ${theme.primary} text-white rounded-lg ${theme.primaryHover} font-medium transition-colors shadow-sm flex items-center gap-2`}
            >
              <Check className="w-4 h-4" />
              Mark as Read
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
