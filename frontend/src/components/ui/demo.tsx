import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";

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
          <Bubble className="rounded-2xl rounded-bl-md bg-muted text-foreground">
            <BubbleContent>Deploying to prod real quick.</BubbleContent>
          </Bubble>
          <MessageFooter className="text-xs text-muted-foreground">
            Just now
          </MessageFooter>
        </MessageContent>
      </Message>

      <Message align="end">
        <MessageAvatar className="size-8">
          <Avatar className="size-8">
            <AvatarFallback>ME</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent className="mr-2 items-end gap-1">
          <MessageHeader className="text-sm font-medium">You</MessageHeader>
          <Bubble className="rounded-2xl rounded-br-md bg-primary text-primary-foreground">
            <BubbleContent>It&apos;s 4:55 PM. On a Friday.</BubbleContent>
          </Bubble>
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
          <Bubble className="rounded-2xl rounded-bl-md bg-muted text-foreground">
            <BubbleContent>
              It&apos;s always a one-line change 😭.
            </BubbleContent>
          </Bubble>
          <MessageFooter className="text-xs text-muted-foreground">
            1m ago
          </MessageFooter>
        </MessageContent>
      </Message>
    </div>
  );
}

export function MessageAvatarDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6 py-12">
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarImage src="/avatars/03.png" alt="@avatar" />
            <AvatarFallback>R</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>
              The build failed during dependency installation.
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageAvatar>
          <Avatar>
            <AvatarImage src="/avatars/10.png" alt="@avatar" />
            <AvatarFallback>R</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble>
            <BubbleContent>Can you share the exact error?</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarImage src="/avatars/03.png" alt="@avatar" />
            <AvatarFallback>R</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <BubbleGroup>
            <Bubble variant="muted">
              <BubbleContent>Here&apos;s the error from the logs</BubbleContent>
            </Bubble>
            <Bubble variant="muted">
              <BubbleContent>
                Something went wrong with the build. The libraries are not
                installed correctly. Try running the build again.
              </BubbleContent>
            </Bubble>
          </BubbleGroup>
        </MessageContent>
      </Message>
    </div>
  );
}

export function MessageHeaderFooterDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8 py-12">
      <Message>
        <MessageContent>
          <MessageHeader>Olivia</MessageHeader>
          <Bubble variant="muted">
            <BubbleContent>I already checked the logs.</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageContent>
          <Bubble>
            <BubbleContent>
              Send the report to the team. Ping @shadcn if you need help.
            </BubbleContent>
          </Bubble>
          <MessageFooter>
            <div>
              Read <span className="font-normal">Yesterday</span>
            </div>
          </MessageFooter>
        </MessageContent>
      </Message>
    </div>
  );
}
