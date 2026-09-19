import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MessageDemo() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 p-6">
      <Message>
        <MessageAvatar className="size-8">
          <Avatar className="size-8">
            <AvatarImage
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="@shadcn"
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent className="ml-2 gap-1">
          <MessageHeader className="text-sm font-medium">shadcn</MessageHeader>
          <div className="w-fit rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm text-foreground">
            Deploying to prod real quick.
          </div>
        </MessageContent>
      </Message>

      <Message align="end">
        <MessageContent className="mr-2 items-end gap-1">
          <div className="w-fit rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            It&apos;s 4:55 PM. On a Friday.
          </div>
          <MessageFooter className="text-xs text-muted-foreground">
            Delivered
          </MessageFooter>
        </MessageContent>
      </Message>

      <Message>
        <MessageAvatar className="size-8">
          <Avatar className="size-8">
            <AvatarImage
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
              alt="@evilrabbit"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent className="ml-2 gap-1">
          <MessageHeader className="text-sm font-medium">
            evilrabbit
          </MessageHeader>
          <div className="w-fit rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm text-foreground">
            It&apos;s always a one-line change 😭.
          </div>
        </MessageContent>
      </Message>
    </div>
  );
}
