import * as React from "react";
import { useState, useRef, useEffect } from "react";

interface User {
    id: number;
    username: string;
}

interface MentionBoxProps {
    users: User[];
}

const MentionBox: React.FC<MentionBoxProps> = ({ users }) => {
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const mentionsRef = useRef<HTMLDivElement>(null);

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(mentionQuery.toLowerCase())
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showMentions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedMentionIndex(prevIndex =>
                    Math.min(prevIndex + 1, filteredUsers.length - 1)
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedMentionIndex(prevIndex => Math.max(prevIndex - 1, 0));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectMention(filteredUsers[selectedMentionIndex]);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const mentionIndex = value.lastIndexOf('@');
        if (mentionIndex !== -1) {
            setMentionQuery(value.substring(mentionIndex + 1));
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }
    };

    const selectMention = (user: User) => {
        if (inputRef.current) {
            const value = inputRef.current.value;
            const mentionIndex = value.lastIndexOf('@');
            const newValue = value.substring(0, mentionIndex) + '@' + user.username + ' ';
            inputRef.current.value = newValue;
            setMentionQuery('');
            setShowMentions(false);
        }
    };

    return (
        <div>
            <input
                ref={inputRef}
                type="text"
                onKeyDown={handleKeyDown}
                onChange={handleInputChange}
            />
            {showMentions && (
                <div ref={mentionsRef} className="mention-box">
                    {filteredUsers.map((user, index) => (
                        <div
                            key={user.id}
                            className={`mention-item ${index === selectedMentionIndex ? 'selected' : ''}`}
                            onClick={() => selectMention(user)}
                        >
                            {user.username}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MentionBox;