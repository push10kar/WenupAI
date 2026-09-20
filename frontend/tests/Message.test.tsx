import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "../src/components/ui/message";
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
} from "../src/components/ui/bubble";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../src/components/ui/avatar";
import MessageDemo, {
  MessageAvatarDemo,
  MessageHeaderFooterDemo,
} from "../src/components/ui/demo";

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

  it("renders canonical Message composition: MessageAvatar and MessageContent with MessageHeader, Bubble, MessageFooter", () => {
    render(
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>shadcn</MessageHeader>
          <Bubble>
            <BubbleContent>How can I help you today?</BubbleContent>
          </Bubble>
          <MessageFooter>Just now</MessageFooter>
        </MessageContent>
      </Message>,
    );

    expect(screen.getByText("CN")).toBeInTheDocument();
    expect(screen.getByText("shadcn")).toBeInTheDocument();
    expect(screen.getByText("How can I help you today?")).toBeInTheDocument();
    expect(screen.getByText("Just now")).toBeInTheDocument();
  });

  it("renders Bubble and BubbleContent components", () => {
    render(
      <Bubble data-testid="test-bubble">
        <BubbleContent>Test message bubble</BubbleContent>
      </Bubble>,
    );

    expect(screen.getByTestId("test-bubble")).toBeInTheDocument();
    expect(screen.getByText("Test message bubble")).toBeInTheDocument();
  });

  it("renders MessageGroup wrapper for stacking consecutive messages from same sender", () => {
    render(
      <MessageGroup data-testid="msg-group" className="custom-group-class">
        <Message align="start">
          <MessageContent>
            <Bubble>
              <BubbleContent>First stacked message</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message align="start">
          <MessageContent>
            <Bubble>
              <BubbleContent>Second stacked message</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </MessageGroup>,
    );

    const group = screen.getByTestId("msg-group");
    expect(group).toHaveAttribute("data-slot", "message-group");
    expect(group).toHaveClass("custom-group-class");
    expect(screen.getByText("First stacked message")).toBeInTheDocument();
    expect(screen.getByText("Second stacked message")).toBeInTheDocument();
  });

  it("verifies MessageAvatar anchors to bottom and clears footer, and footer follows align='end'", () => {
    render(
      <Message align="end" data-testid="sender-row">
        <MessageAvatar data-testid="msg-avatar" className="custom-avatar">
          <Avatar>
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent data-testid="msg-content" className="custom-content">
          <MessageHeader data-testid="msg-header" className="custom-header">
            Sender Name
          </MessageHeader>
          <Bubble className="custom-bubble">
            <BubbleContent className="custom-bubble-content">
              End aligned content
            </BubbleContent>
          </Bubble>
          <MessageFooter data-testid="msg-footer" className="custom-footer">
            <span data-testid="msg-action">Action / Status</span>
          </MessageFooter>
        </MessageContent>
      </Message>,
    );

    const message = screen.getByTestId("sender-row");
    expect(message).toHaveAttribute("data-align", "end");
    expect(message.className).toContain("data-[align=end]:flex-row-reverse");

    const avatar = screen.getByTestId("msg-avatar");
    expect(avatar).toHaveClass("self-end");
    expect(avatar).toHaveClass("custom-avatar");
    expect(avatar.className).toContain(
      "group-has-data-[slot=message-footer]/message:-translate-y-8",
    );

    const content = screen.getByTestId("msg-content");
    expect(content).toHaveClass("custom-content");
    expect(content.className).toContain(
      "group-data-[align=end]/message:items-end",
    );

    const header = screen.getByTestId("msg-header");
    expect(header).toHaveClass("custom-header");
    expect(header.className).toContain(
      "group-data-[align=end]/message:justify-end",
    );

    const footer = screen.getByTestId("msg-footer");
    expect(footer).toHaveClass("custom-footer");
    expect(footer.className).toContain(
      "group-data-[align=end]/message:justify-end",
    );
    expect(screen.getByTestId("msg-action")).toBeInTheDocument();
  });

  it("renders BubbleGroup component wrapping consecutive bubbles", () => {
    render(
      <BubbleGroup data-testid="test-bubble-group">
        <Bubble>
          <BubbleContent>First item</BubbleContent>
        </Bubble>
        <Bubble>
          <BubbleContent>Second item</BubbleContent>
        </Bubble>
      </BubbleGroup>,
    );

    const group = screen.getByTestId("test-bubble-group");
    expect(group).toHaveAttribute("data-slot", "bubble-group");
    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
  });

  it("renders MessageAvatarDemo without throwing and with align='end' avatar row", () => {
    render(<MessageAvatarDemo />);

    expect(
      screen.getByText("The build failed during dependency installation."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Can you share the exact error?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Here's the error from the logs"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Something went wrong with the build/i),
    ).toBeInTheDocument();
  });

  it("renders MessageHeaderFooterDemo with MessageHeader for sender name and MessageFooter", () => {
    render(<MessageHeaderFooterDemo />);

    expect(screen.getByText("Olivia")).toBeInTheDocument();
    expect(screen.getByText("I already checked the logs.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Send the report to the team. Ping @shadcn if you need help.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
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
