import { Button, Layout, Link, Page, Text } from "@vercel/examples-ui";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { KeyDetailsPanel } from "../../components/KeyDetailsPanel";
import { MediaKeyPanel } from "../../components/MediaKeyPanel";
import { PublishPanel } from "../../components/PublishPanel";
import {
	deleteMediaKey,
	fetchKeyDetails,
	fetchMediaKeys,
	type KeyDetails,
	type MediaKeys,
	saveMediaKey,
} from "../../lib/media-keys";

// Dynamically import markdown preview to avoid SSR issues
const MarkdownPreview = dynamic(
	() => import("../../components/MarkdownPreview"),
	{
		ssr: false,
	},
);

function KeyPage() {
	const router = useRouter();
	const { key, loginPasswd } = router.query;
	const [mediaKeys, setMediaKeys] = useState<MediaKeys>({});
	const [keyDetails, setKeyDetails] = useState<KeyDetails | null>(null);
	const [markdownContent, setMarkdownContent] = useState("");

	useEffect(() => {
		if (key && loginPasswd) {
			const loadData = async () => {
				try {
					const [details, keys] = await Promise.all([
						fetchKeyDetails(key as string, loginPasswd as string),
						fetchMediaKeys(key as string, loginPasswd as string),
					]);
					setKeyDetails(details);
					setMediaKeys(keys);
				} catch (err) {
					console.error("Failed to load data");
				}
			};
			loadData();
		}
	}, [key, loginPasswd]);

	return (
		<Page>
			<div className="text-center mb-6">
				<Text variant="h1" className="mb-4">
					Key Details
				</Text>
			</div>

			<KeyDetailsPanel keyDetails={keyDetails} />

			<MediaKeyPanel
				mediaKeys={mediaKeys}
				setMediaKeys={setMediaKeys}
				apiKey={key as string}
				loginPasswd={loginPasswd as string}
			/>

			<PublishPanel apiKey={key as string} />

			<div className="mt-8">
				<Link href="/">
					<Button variant="secondary">Back to Home</Button>
				</Link>
			</div>
		</Page>
	);
}

KeyPage.Layout = Layout;

export default KeyPage;
