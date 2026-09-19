import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
} from "../src/components/ui/message";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../src/components/ui/avatar";
import MessageDemo from "../src/components/ui/demo";

describe("UI: Message and Avatar Components", () => {
  it("renders Message with start and end alignments", () => {
    const { rerender } = render(
      <Message align="start" data-testid="msg">
        <MessageContent>
          <p>Hello from start</p>
        </MessageContent>
      </Message>,
    );

    const msgElement = screen.getByTestId("msg");
    expect(msgElement).toHaveAttribute("data-align", "start");
    expect(screen.getByText("Hello from start")).toBeInTheDocument();

    rerender(
      <Message align="end" data-testid="msg">
        <MessageContent>
          <p>Hello from end</p>
        </MessageContent>
      </Message>,
    );
    expect(msgElement).toHaveAttribute("data-align", "end");
    expect(screen.getByText("Hello from end")).toBeInTheDocument();
  });

  it("renders Avatar with image and fallback", () => {
    render(
      <Avatar className="size-8">
        <AvatarImage
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
          alt="Avatar User"
        />
        <AvatarFallback>AU</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByText("AU")).toBeInTheDocument();
  });

  it("renders MessageHeader and MessageFooter within MessageContent", () => {
    render(
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>Assistant</MessageHeader>
          <div>Message body content</div>
          <MessageFooter>Delivered</MessageFooter>
        </MessageContent>
      </Message>,
    );

    expect(screen.getByText("Assistant")).toBeInTheDocument();
    expect(screen.getByText("Message body content")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("renders MessageDemo without throwing", () => {
    render(<MessageDemo />);

    expect(screen.getByText("shadcn")).toBeInTheDocument();
    expect(
      screen.getByText("Deploying to prod real quick."),
    ).toBeInTheDocument();
    expect(screen.getByText("It's 4:55 PM. On a Friday.")).toBeInTheDocument();
    expect(screen.getByText("evilrabbit")).toBeInTheDocument();
  });
});
