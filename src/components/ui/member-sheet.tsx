import * as React from "react"
import { ScrollArea } from "./scroll-area";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, } from "./sheet";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./dropdown-menu";
import { Crown, MoreVertical, Users, UserX } from "lucide-react";
import { Input } from "./input";
type Member = {
    // id: string;
    // isOwner: boolean;
    // name: string;
    role: 'member' | 'owner' | 'cohost',
    email?: string;
    username: string;
    socketId: string;
};

export default function MembersSheet({ currentUser, role, access, members, handleKick, handlePromote }: { currentUser: Member, role: string, access: boolean, members: Array<Member>, handleKick: Function, handlePromote: Function }) {
    const [searchText, setSearchText] = React.useState<string | ''>('');

    // console.log(currentUser)
    // console.log(members)
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" className="flex gap-1">
                    {members.length}
                    <Users className=" h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Room Members</SheetTitle>
                    <SheetDescription>
                        View and manage room members here.
                    </SheetDescription>
                    <Input placeholder='Search People...' onChange={(e) => setSearchText(e.target.value)} />
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                    {members
                        .filter(member => member.username.toLowerCase().includes(searchText.toLowerCase()))
                        .map(member => {
                            const haveAccess: boolean = member.socketId == currentUser.socketId && access
                            return <div key={member.socketId} className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-2">
                                    <span>{member.username}</span>
                                    <span className="text-gray-400">{member.socketId == currentUser.socketId && '(You)'}</span>
                                </div>
                                {member.role == 'owner' ?
                                    <Crown className="mr-3 h-4 w-4 text-yellow-500" /> :
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem className="text-red-500 hover:text-red-700" disabled={!haveAccess} onClick={() => { (role == 'owner' && access) && handleKick }} data-target-name={member.username} data-target-user={member.socketId}>
                                                <UserX className="mr-2 h-4 w-4" /> Kick
                                            </DropdownMenuItem>
                                            {(
                                                <DropdownMenuItem className="text-green-500 hover:text-green-700"  onClick={(e) => handlePromote(e)} data-target-name={member.username} data-target-user={member.socketId}>
                                                    <Crown className="mr-2 h-4 w-4" />
                                                    Promote to Owner
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                }
                            </div>
                        })}
                    {members.filter(member => member.username.toLowerCase().includes(searchText.toLowerCase())).length === 0 && (
                        <div className="flex items-center justify-center py-2">
                            <span>No username</span>
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
