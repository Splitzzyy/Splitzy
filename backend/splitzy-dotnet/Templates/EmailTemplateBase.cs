namespace splitzy_dotnet.Templates
{
    public abstract class EmailTemplateBase
    {
        protected string Layout(string title, string body)
        {
            return $"""
                <html>
                    <body style="
                        margin: 0;
                        padding: 24px;
                        background: #f4f6f8;
                        font-family: Arial, Helvetica, sans-serif;
                        color: #1f2937;
                    ">
                        <div style="
                            max-width: 600px;
                            margin: 0 auto;
                            background: #ffffff;
                            padding: 28px;
                            border-radius: 10px;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                        ">
                            <h2 style="
                                margin: 0 0 16px 0;
                                font-size: 22px;
                                color: #111827;
                            ">
                                {title}
                            </h2>

                            {body}

                            <hr style="
                                border: none;
                                border-top: 1px solid #e5e7eb;
                                margin: 32px 0 16px 0;
                            " />

                            <p style="
                                font-size: 12px;
                                color: #6b7280;
                                margin: 0;
                                text-align: center;
                            ">
                                by <a 
                                    href="https://splitzy.aarshiv.xyz/" 
                                    target="_blank" 
                                    style="color:#6b7280; text-decoration:none; font-weight:600;"
                                >
                                    Splitzy
                                </a>
                            </p>
                        </div>
                    </body>
                </html>
            """;
        }
    }
}
