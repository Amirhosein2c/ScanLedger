import { NextRequest } from "next/server";
import { _GD } from "../../../utils/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    path?: string[];
  };
};

const handleRequest = async (request: NextRequest, context: RouteContext) => {
  return _GD(request, context);
};

export const GET = async (request: NextRequest, context: RouteContext) =>
  handleRequest(request, context);
export const POST = async (request: NextRequest, context: RouteContext) =>
  handleRequest(request, context);
export const PUT = async (request: NextRequest, context: RouteContext) =>
  handleRequest(request, context);
export const PATCH = async (request: NextRequest, context: RouteContext) =>
  handleRequest(request, context);
export const DELETE = async (request: NextRequest, context: RouteContext) =>
  handleRequest(request, context);
// export const OPTIONS = async (request: NextRequest, context: RouteContext) =>
//   handleRequest(request, context);
// export const HEAD = async (request: NextRequest, context: RouteContext) =>
//   handleRequest(request, context);
