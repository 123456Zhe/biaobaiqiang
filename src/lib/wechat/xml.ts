import { XMLParser, XMLBuilder } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  trimValues: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: false,
  suppressEmptyNode: false,
  processEntities: false,
});

export type IncomingMessage = {
  ToUserName: string;
  FromUserName: string;
  CreateTime: string;
  MsgType: string;
  Content?: string;
  MsgId?: string;
  Event?: string;
  EventKey?: string;
};

export function parseIncomingXml(xml: string): IncomingMessage | null {
  const obj = parser.parse(xml);
  const m = obj?.xml;
  if (!m) return null;
  return {
    ToUserName: m.ToUserName ?? "",
    FromUserName: m.FromUserName ?? "",
    CreateTime: m.CreateTime ?? "",
    MsgType: m.MsgType ?? "",
    Content: m.Content,
    MsgId: m.MsgId,
    Event: m.Event,
    EventKey: m.EventKey,
  };
}

export function buildTextReply({
  toUser,
  fromUser,
  content,
}: {
  toUser: string;
  fromUser: string;
  content: string;
}) {
  const obj = {
    xml: {
      ToUserName: toUser,
      FromUserName: fromUser,
      CreateTime: Math.floor(Date.now() / 1000),
      MsgType: "text",
      Content: content,
    },
  };
  return builder.build(obj);
}

export const EMPTY_SUCCESS = "success";
