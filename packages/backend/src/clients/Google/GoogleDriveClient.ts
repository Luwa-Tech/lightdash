import { google, sheets_v4 } from 'googleapis';
import { lightdashConfig } from '../../config/lightdashConfig';
import Logger from '../../logging/logger';

export class GoogleDriveClient {
    public isEnabled: boolean = false;

    constructor() {
        this.isEnabled =
            lightdashConfig.auth.google.oauth2ClientId !== undefined &&
            lightdashConfig.auth.google.oauth2ClientSecret !== undefined;
    }

    static async getCredentials(refreshToken: string) {
        try {
            const credentials = {
                type: 'authorized_user',
                client_id: lightdashConfig.auth.google.oauth2ClientId,
                client_secret: lightdashConfig.auth.google.oauth2ClientSecret,
                refresh_token: refreshToken,
            };
            const authClient = google.auth.fromJSON(credentials);
            return new google.auth.GoogleAuth({
                authClient,
            });
        } catch (err) {
            throw new Error(`Failed to get credentials: ${err}`);
        }
    }

    private static async changeTabTitle(
        sheets: sheets_v4.Sheets,
        fileId: string,
        title: string,
    ) {
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: fileId,
        });
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: fileId,
            requestBody: {
                requests: [
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId:
                                    spreadsheet.data.sheets?.[0].properties
                                        ?.sheetId,
                                title,
                            },
                            fields: 'title',
                        },
                    },
                ],
            },
        });
    }

    async createNewTab(refreshToken: string, fileId: string, tabName: string) {
        if (!this.isEnabled) {
            throw new Error('Google Drive is not enabled');
        }
        const auth = await GoogleDriveClient.getCredentials(refreshToken);
        const sheets = google.sheets({ version: 'v4', auth });

        // Creates a new tab in the sheet
        const tabTitle = tabName.replaceAll(':', '.'); // we can't use ranges with colons in their tab ids
        await sheets.spreadsheets
            .batchUpdate({
                spreadsheetId: fileId,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: tabTitle,
                                },
                            },
                        },
                    ],
                },
            })
            .catch((error: any) => {
                if (
                    error.code === 400 &&
                    error.errors[0]?.message.includes('already exists.')
                ) {
                    Logger.debug('tab already exist, we will overwrite it');
                } else {
                    throw new Error(error);
                }
            });

        return tabTitle;
    }

    private static async clearTabName(
        sheets: sheets_v4.Sheets,
        fileId: string,
        tabName?: string,
    ) {
        // The method "SheetId: 0" only works if the first default sheet tab still exists (it's not deleted by the user)
        // So instead we select all the cells in the first tab by its name
        try {
            if (tabName === undefined) {
                const spreadsheet = await sheets.spreadsheets.get({
                    spreadsheetId: fileId,
                });
                const firstSheetName =
                    spreadsheet.data.sheets?.[0].properties?.title;
                if (!firstSheetName) {
                    throw new Error(
                        'Unable to find the first sheet name in the spreadsheet',
                    );
                }
                Logger.debug(`Clearing first sheet name ${firstSheetName}`);
                await sheets.spreadsheets.values.clear({
                    spreadsheetId: fileId,
                    range: firstSheetName,
                });
            } else {
                Logger.debug(`Clearing sheet name ${tabName}`);

                await sheets.spreadsheets.values.clear({
                    spreadsheetId: fileId,
                    range: tabName,
                });
            }
        } catch (error) {
            Logger.error('Unable to clear the sheet', error);
        }
    }

    async appendToSheet(
        refreshToken: string,
        fileId: string,
        csvContent: Record<string, string>[],
        tabName?: string,
    ) {
        if (!this.isEnabled) {
            throw new Error('Google Drive is not enabled');
        }
        const auth = await GoogleDriveClient.getCredentials(refreshToken);
        const sheets = google.sheets({ version: 'v4', auth });

        // Clear first sheet before writting
        GoogleDriveClient.clearTabName(sheets, fileId, tabName);

        if (csvContent.length === 0) {
            Logger.info('No data to write to the sheet');
            return;
        }
        const header = Object.keys(csvContent[0]);
        const values = csvContent.map((row) => Object.values(row));

        await sheets.spreadsheets.values.update({
            spreadsheetId: fileId,
            range: tabName ? `${tabName}!A1` : 'A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [header, ...values],
            },
        });

        const updatedTimestamp = new Date()
            .toLocaleString()
            .replaceAll(':', '.');
        await GoogleDriveClient.changeTabTitle(
            sheets,
            fileId,
            updatedTimestamp,
        );
    }
}