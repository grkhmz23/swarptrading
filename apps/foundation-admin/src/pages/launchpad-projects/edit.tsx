import { GenericEdit } from "@/components/GenericEdit";

export const LaunchpadProjectEdit = () => (
  <GenericEdit
    resource="launchpad-project"
    title="Launchpad Project"
    listPath="/launchpad-projects"
    fields={[
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'ticker', label: 'Ticker', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'isFeatured', label: 'Featured Project (Show in Featured Section)', type: 'checkbox' },
      { key: 'imageUrl', label: 'Image URL', type: 'text' },
      { key: 'videoUrl', label: 'Video URL', type: 'text' },
      { key: 'twitterUrl', label: 'Twitter URL', type: 'text' },
      { key: 'telegramUrl', label: 'Telegram URL', type: 'text' },
      { key: 'websiteUrl', label: 'Website URL', type: 'text' },
      { key: 'discordUrl', label: 'Discord URL', type: 'text' },
      { key: 'profileScore', label: 'Profile Score (0-100)', type: 'number' },
    ]}
  />
);
