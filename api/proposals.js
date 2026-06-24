import proposal from "./proposals/[slug].js";

export default function handler(req, res) {
  return proposal(req, res);
}
