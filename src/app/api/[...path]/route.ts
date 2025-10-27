import { NextRequest } from "next/server";
import { _GD } from "../../../utils/server";

export const dynamic = "force-dynamic";

const handleRequest = async (request: NextRequest) => {
  return _GD(request);
};

export const GET = async (request: NextRequest) => handleRequest(request);
export const POST = async (request: NextRequest) => handleRequest(request);
export const PUT = async (request: NextRequest) => handleRequest(request);
export const PATCH = async (request: NextRequest) => handleRequest(request);
export const DELETE = async (request: NextRequest) => handleRequest(request);
// export const OPTIONS = async (request: NextRequest, context: RouteContext) =>
//   handleRequest(request, context);
// export const HEAD = async (request: NextRequest, context: RouteContext) =>
//   handleRequest(request, context);
